import type { ParseResult, ParserOptions } from "@babel/parser";
import type { File, Node, JSXAttribute, JSXElement, JSXFragment, JSXSpreadAttribute, Expression, JSXEmptyExpression } from "@babel/types";
import api from "../api.generated.json";

/*
 * The React snippet as a neutral tree (plan docs/research/code-languages-plan-2026-10-03.md §3.A): what every
 * language emitter reads, so none of them parses TSX itself. @babel/parser loads lazily, only when a snippet is read.
 *
 * Snippets come in three shapes: a module (imports + JSX), imports + a bare JSX tag or several sibling tags (a
 * playground's code), and imports + statements followed by JSX (state, then the markup). Each is read whole; a
 * snippet that is not valid TSX in any shape fails with the parser's message, never half-read.
 */

export type SnippetValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  /** A string that is one member of the prop's union type (level="primary"). */
  | { kind: "enum"; value: string }
  /** An icon name (startIcon="icon-check-line"). */
  | { kind: "icon"; value: string }
  /** JSX passed as a prop (startIcon={<Icon … />}). */
  | { kind: "node"; value: SnippetNode[] }
  /** A function, or what an on… prop is given. */
  | { kind: "handler"; code: string }
  | { kind: "expression"; code: string };

export type SnippetProp = { name: string; value: SnippetValue } | { spread: string };

export type SnippetElement = {
  type: "element";
  /** The tag: "Button", "Table.Row", or an HTML element ("div"). */
  component: string;
  /** Imported from @zen-ds/react. */
  library: boolean;
  props: SnippetProp[];
  children: SnippetNode[];
};

export type SnippetNode =
  | SnippetElement
  | { type: "fragment"; children: SnippetNode[] }
  | { type: "text"; value: string }
  /** {count}, {items.map(…)}, {open && …}: kept as source until an emitter maps it. */
  | { type: "expression"; code: string };

export type SnippetImport = { source: string; names: string[] };

export type SnippetTree = {
  imports: SnippetImport[];
  /** The outermost JSX, in source order (a JSX value nested in an expression stays inside that expression's code). */
  elements: SnippetNode[];
  /** Other top-level code (state, handlers, helpers), as source. */
  statements: string[];
};

export type SnippetParse = { ok: true; tree: SnippetTree } | { ok: false; error: string };

type Parse = typeof import("@babel/parser").parse;

const LIBRARY = "@zen-ds/react";

/** String-literal unions of each component's props, from the generated props docs ("primary" | "accent" …). */
let unions: Map<string, Set<string>> | null = null;
let iconProps: Set<string> | null = null;
function propTypes() {
  if (!unions || !iconProps) {
    unions = new Map();
    iconProps = new Set();
    for (const entries of Object.values(api as Record<string, Array<{ name: string; props: Array<{ name: string; type: string }> }>>)) {
      for (const component of entries) {
        for (const prop of component.props) {
          const key = `${component.name}.${prop.name}`;
          if (/\bIconName\b/.test(prop.type)) iconProps.add(key);
          const members = [...prop.type.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
          if (members.length) unions.set(key, new Set(members));
        }
      }
    }
  }
  return { unions, iconProps };
}

function classifyString(component: string, prop: string, value: string): SnippetValue {
  const { unions: known, iconProps: icons } = propTypes();
  const key = `${component}.${prop}`;
  if (icons.has(key) && value.startsWith("icon-")) return { kind: "icon", value };
  if (known.get(key)?.has(value)) return { kind: "enum", value };
  return { kind: "string", value };
}

function tagName(name: JSXElement["openingElement"]["name"]): string {
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXNamespacedName") return `${name.namespace.name}:${name.name.name}`;
  return `${tagName(name.object)}.${name.property.name}`;
}

/** JSX text as React renders it: lines trimmed, line breaks between words become one space, blank lines dropped. */
function jsxText(raw: string) {
  const lines = raw.split(/\r\n|\n|\r/);
  return lines
    .map((line, index) => {
      let text = line.replace(/\t/g, " ");
      if (index > 0) text = text.replace(/^ +/, "");
      if (index < lines.length - 1) text = text.replace(/ +$/, "");
      return text;
    })
    .filter(Boolean)
    .join(" ");
}

class Reader {
  constructor(private readonly source: string, private readonly library: Set<string>) {}

  code(node: Node) {
    return this.source.slice(node.start ?? 0, node.end ?? 0);
  }

  element(node: JSXElement | JSXFragment): SnippetNode {
    if (node.type === "JSXFragment") return { type: "fragment", children: this.children(node.children) };
    const component = tagName(node.openingElement.name);
    return {
      type: "element",
      component,
      library: this.library.has(component.split(".")[0]),
      props: node.openingElement.attributes.map((attribute) => this.prop(component, attribute)),
      children: this.children(node.children),
    };
  }

  prop(component: string, attribute: JSXAttribute | JSXSpreadAttribute): SnippetProp {
    if (attribute.type === "JSXSpreadAttribute") return { spread: this.code(attribute.argument) };
    const name = attribute.name.type === "JSXIdentifier" ? attribute.name.name : `${attribute.name.namespace.name}:${attribute.name.name.name}`;
    const value = attribute.value;
    if (!value) return { name, value: { kind: "boolean", value: true } };
    if (value.type === "StringLiteral") return { name, value: classifyString(component, name, value.value) };
    if (value.type === "JSXElement" || value.type === "JSXFragment") return { name, value: { kind: "node", value: [this.element(value)] } };
    return { name, value: this.expressionValue(component, name, value.expression) };
  }

  expressionValue(component: string, name: string, expression: Expression | JSXEmptyExpression): SnippetValue {
    switch (expression.type) {
      case "StringLiteral": return classifyString(component, name, expression.value);
      case "NumericLiteral": return { kind: "number", value: expression.value };
      case "BooleanLiteral": return { kind: "boolean", value: expression.value };
      case "TemplateLiteral":
        if (!expression.expressions.length) return classifyString(component, name, expression.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join(""));
        break;
      case "UnaryExpression":
        if (expression.operator === "-" && expression.argument.type === "NumericLiteral") return { kind: "number", value: -expression.argument.value };
        break;
      case "JSXElement":
      case "JSXFragment":
        return { kind: "node", value: [this.element(expression)] };
      case "ArrowFunctionExpression":
      case "FunctionExpression":
        return { kind: "handler", code: this.code(expression) };
      default:
        if (/^on[A-Z]/.test(name) && (expression.type === "Identifier" || expression.type === "MemberExpression" || expression.type === "CallExpression")) return { kind: "handler", code: this.code(expression) };
    }
    return { kind: "expression", code: this.code(expression) };
  }

  children(children: JSXElement["children"]): SnippetNode[] {
    const out: SnippetNode[] = [];
    for (const child of children) {
      if (child.type === "JSXText") {
        const value = jsxText(child.value);
        if (value) out.push({ type: "text", value });
      } else if (child.type === "JSXElement" || child.type === "JSXFragment") {
        out.push(this.element(child));
      } else if (child.type === "JSXExpressionContainer") {
        const expression = child.expression;
        if (expression.type === "JSXEmptyExpression") continue; // {/* a comment */}
        if (expression.type === "StringLiteral") out.push({ type: "text", value: expression.value });
        else if (expression.type === "JSXElement" || expression.type === "JSXFragment") out.push(this.element(expression));
        else out.push({ type: "expression", code: this.code(expression) });
      } else {
        out.push({ type: "expression", code: `...${this.code(child.expression)}` });
      }
    }
    return out;
  }
}

/** Every outermost JSX node under `node`, in source order. */
function outermostJsx(node: unknown, found: Array<JSXElement | JSXFragment>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((item) => outermostJsx(item, found)); return; }
  const typed = node as Node;
  if (typed.type === "JSXElement" || typed.type === "JSXFragment") { found.push(typed); return; }
  for (const [key, value] of Object.entries(typed)) {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments" || key === "innerComments" || key === "extra") continue;
    if (value && typeof value === "object") outermostJsx(value, found);
  }
}

const OPTIONS: ParserOptions = { sourceType: "module", plugins: ["jsx", "typescript"] };

/** The snippet as a parse whose JSX positions point into `source` (a wrapped variant shifts them back). */
function parseShapes(parse: Parse, code: string): { ast: ParseResult<File>; source: string } {
  try {
    return { ast: parse(code, OPTIONS), source: code };
  } catch (first) {
    // Imports, then statements, then sibling JSX tags: wrap the markup (from its first line that starts a tag) in a
    // fragment. A fragment of one tag reads the same as the tag.
    const lines = code.split("\n");
    const start = lines.findIndex((line, index) => /^<[A-Za-z>]/.test(line) && !lines.slice(0, index).some((before) => /^<[A-Za-z>]/.test(before)));
    if (start < 0) throw first;
    const head = lines.slice(0, start).join("\n");
    const markup = lines.slice(start).join("\n");
    const source = `${head}\n<>\n${markup}\n</>;\n`;
    try {
      return { ast: parse(source, OPTIONS), source };
    } catch (second) {
      // Sibling tags were the first problem: the wrapped parse names the real one.
      throw first instanceof Error && first.message.startsWith("Adjacent JSX") ? second : first;
    }
  }
}

/** Reads a React snippet into the neutral tree. */
export async function parseSnippet(code: string): Promise<SnippetParse> {
  const { parse } = await import("@babel/parser");
  return readSnippet(parse, code);
}

/** parseSnippet with the parser already loaded (tests, batches). */
export function readSnippet(parse: Parse, code: string): SnippetParse {
  let parsed: { ast: ParseResult<File>; source: string };
  try {
    parsed = parseShapes(parse, code);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const { ast, source } = parsed;
  const imports: SnippetImport[] = [];
  const library = new Set<string>();
  const statements: string[] = [];
  const found: Array<JSXElement | JSXFragment> = [];
  const reader = new Reader(source, library);
  for (const statement of ast.program.body) {
    if (statement.type === "ImportDeclaration") {
      const names = statement.specifiers.map((specifier) => specifier.local.name);
      imports.push({ source: statement.source.value, names });
      if (statement.source.value === LIBRARY) names.forEach((name) => library.add(name));
      continue;
    }
    const before = found.length;
    outermostJsx(statement, found);
    // A statement that is only markup (a playground's tag, the wrapped siblings) is markup, not code to keep.
    const onlyMarkup = statement.type === "ExpressionStatement" && (statement.expression.type === "JSXElement" || statement.expression.type === "JSXFragment");
    if (!onlyMarkup || found.length === before) statements.push(reader.code(statement));
  }
  const elements = found.flatMap((node, index) => {
    const read = reader.element(node);
    // The fragment around sibling tags (the last markup) is ours, not the snippet's.
    return source !== code && index === found.length - 1 && read.type === "fragment" ? read.children : [read];
  });
  return { ok: true, tree: { imports, elements, statements } };
}
