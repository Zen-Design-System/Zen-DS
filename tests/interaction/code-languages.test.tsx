/**
 * The docs Code view in other languages, P1 (plan docs/research/code-languages-plan-2026-10-03.md §6): the snippet
 * parser reads every playground's code into the neutral tree, and the language picker keeps every language listed
 * with its honest state (user, 2026-11-12: all six). Real browser (Chromium).
 */
import { parse } from "@babel/parser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page as browser } from "vitest/browser";
import { ZenProvider } from "../../src/index";
import { componentNavigation } from "../../src/platform/PlatformApp";
import { PlatformComponentPage } from "../../src/platform/PlatformExamples";
import { componentsIn, snippetStatus } from "../../src/platform/code/languages";
import { setCodeLanguage } from "../../src/platform/code/preference";
import { readSnippet, type SnippetElement, type SnippetNode } from "../../src/platform/code/snippet";
import { exampleCode } from "../../src/platform/examples/exampleCode";
import { SnippetCode } from "../../src/platform/code/SnippetCode";
import { htmlSnippet, markupOf } from "../../src/platform/code/html";
import { SnippetSpecimenContext } from "../../src/platform/code/specimen";
import { Button, Checkbox, Stack } from "../../src/index";
import { StudioBridgeContext, type StudioBridge } from "../../src/platform/studio/bridge";

/** Every playground's code at its default state: PlatformCode hands it here instead of drawing it. */
const captured = vi.hoisted(() => ({ codes: [] as string[] }));
vi.mock("../../src/platform/PlatformCode", () => ({
  PlatformCode: ({ code }: { code: string }) => {
    captured.codes.push(code);
    return null;
  },
}));

/** Only the playground of a component page renders (no examples, props or guidelines): the Studio's seam. */
const playgroundOnly: StudioBridge = { renderComponentPage: ({ playground }) => <>{playground}</>, renderCode: () => null, controlsSlot: null, codeSlot: null };

const walk = (nodes: SnippetNode[], out: SnippetElement[] = []): SnippetElement[] => {
  for (const node of nodes) {
    if (node.type === "element") { out.push(node); walk(node.children, out); for (const prop of node.props) if ("value" in prop && prop.value.kind === "node") walk(prop.value.value, out); }
    else if (node.type === "fragment") walk(node.children, out);
  }
  return out;
};

afterEach(() => setCodeLanguage("react"));

describe("snippet parser", () => {
  it("reads every playground snippet into the neutral tree", async () => {
    const perPage = new Map<string, number>();
    for (const { id } of componentNavigation) {
      const before = captured.codes.length;
      const screen = await render(
        <ZenProvider>
          <StudioBridgeContext value={playgroundOnly}><PlatformComponentPage page={id} /></StudioBridgeContext>
        </ZenProvider>,
      );
      perPage.set(id, captured.codes.length - before);
      await screen.unmount();
    }
    const snippets = [...new Set(captured.codes)];
    const failures = snippets.map((code) => ({ code, result: readSnippet(parse, code) })).filter(({ result }) => !result.ok);
    expect(failures.map(({ code, result }) => `${result.ok ? "" : result.error}\n${code.slice(0, 160)}`)).toEqual([]);
    // The plan counted 44 PlatformCode playgrounds (2026-10-03); pages have been added since.
    expect(snippets.length).toBeGreaterThanOrEqual(44);
    expect([...perPage].filter(([, count]) => !count).map(([id]) => id)).toEqual([]);
    console.info(`snippet parser: ${snippets.length}/${snippets.length} playground snippets read (${componentNavigation.length} pages)`);
  });

  it("keeps imports, props by kind, children and the code it does not map", () => {
    const result = readSnippet(parse, `import { Button, Icon } from "@zen-ds/react";

const [count, setCount] = useState(0);

<Button
  level="primary"
  size="md"
  disabled
  startIcon={<Icon name="icon-check-line" decorative />}
  onClick={() => setCount(count + 1)}
  aria-label={label}
>
  Saved {count}
</Button>
<Icon name="icon-plus-line" />`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { imports, elements, statements } = result.tree;
    expect(imports).toEqual([{ source: "@zen-ds/react", names: ["Button", "Icon"] }]);
    expect(statements).toEqual(["const [count, setCount] = useState(0);"]);
    expect(elements.map((node) => node.type === "element" && node.component)).toEqual(["Button", "Icon"]);
    const button = elements[0] as SnippetElement;
    expect(button.library).toBe(true);
    expect(Object.fromEntries(button.props.map((prop) => ("name" in prop ? [prop.name, prop.value.kind] : ["…", "spread"])))).toEqual({
      level: "enum", size: "enum", disabled: "boolean", startIcon: "node", onClick: "handler", "aria-label": "expression",
    });
    expect(button.children).toEqual([{ type: "text", value: "Saved " }, { type: "expression", code: "count" }]);
    const icon = walk(elements).find((element) => element.component === "Icon");
    expect(icon?.props[0]).toEqual({ name: "name", value: { kind: "icon", value: "icon-check-line" } });
  });

  it("fails with the parser's message instead of half a tree", () => {
    const result = readSnippet(parse, "<Button level=\"primary\">Save</Button");
    expect(result.ok).toBe(false);
  });

  it("reads every example file as its snippet: a module that imports the package and the demo world (P2b)", () => {
    const files = import.meta.glob<string>("../../src/platform/examples/pages/*/*.example.tsx", { query: "?raw", import: "default", eager: true });
    const read = Object.entries(files).map(([file, raw]) => ({ file, code: exampleCode(raw), result: readSnippet(parse, exampleCode(raw)) }));
    expect(read.filter(({ result }) => !result.ok).map(({ file, result }) => `${file}: ${result.ok ? "" : result.error}`)).toEqual([]);
    // The package by name, the demo world as the reader's own ./demo: nothing from the docs.
    const sources = new Set(read.flatMap(({ result }) => (result.ok ? result.tree.imports.map((entry) => entry.source) : [])));
    expect([...sources].filter((source) => !["react", "@zen-ds/react", "./demo"].includes(source))).toEqual([]);
    expect(read.length).toBeGreaterThanOrEqual(13);
  });
});

describe("language picker", () => {
  const code = `import { Button } from "@zen-ds/react";\n\n<Button level="primary">Save</Button>`;

  it("finds the snippet's components and their status", () => {
    expect(componentsIn(`<Stack><Button /><IconButton /><div /><NotAComponent /></Stack>`)).toEqual(["Stack", "Button", "IconButton"]);
    expect(snippetStatus(code, "react")).toEqual({ status: "ready", missing: [] });
    expect(snippetStatus(code, "vue")).toEqual({ status: "not-yet", missing: ["Button"] });
  });

  it("lists every language; one without code says so, hides Copy, and is remembered", async () => {
    const screen = await render(<ZenProvider><SnippetCode code={code} /></ZenProvider>);
    await expect.element(screen.getByRole("button", { name: "Copy code" })).toBeVisible();
    await screen.getByRole("button", { name: /^Code language/ }).click();
    const options = browser.getByRole("option");
    await expect.poll(async () => (await options.all()).map((option) => option.element().textContent)).toEqual(["React", "HTMLNot yet", "VueNot yet", "SwiftNot yet", "FlutterNot yet", "SvelteNot yet"]);
    await browser.getByRole("option", { name: /^Vue/ }).click();
    await expect.element(screen.getByText("Vue isn't available for Button yet.")).toBeVisible();
    await expect.element(screen.getByText(/React is available\./)).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "See language status" })).toHaveAttribute("href", expect.stringContaining("page=installation"));
    expect(screen.getByRole("button", { name: "Copy code" }).query()).toBeNull();
    expect(window.localStorage.getItem("zen-docs:code-language")).toBe("vue");
    expect(new URLSearchParams(window.location.search).get("code")).toBe("vue");
    setCodeLanguage("react");
    await expect.element(screen.getByRole("button", { name: "Copy code" })).toBeVisible();
    expect(new URLSearchParams(window.location.search).get("code")).toBeNull();
  });
});

describe("HTML snippets", () => {
  it("writes the specimen's markup: library classes only, readable ids, docs chrome out, wrappers unwrapped", async () => {
    const screen = await render(
      <ZenProvider>
        <div data-testid="row" className="platform-example-row">
          <div className="platform-phone" data-snippet-unwrap data-breakpoint="mobile">
            <span data-snippet-skip>9:41</span>
            <Stack gap="xs" className="pe-demo">
              <span id="«r7»" className="zen-demo-label">Plan</span>
              <input aria-labelledby="«r7»" defaultValue="Pro" data-zen-src="x.tsx:1:1" />
              <a href="#«r7»">Back to the label</a>
            </Stack>
          </div>
        </div>
      </ZenProvider>,
    );
    const row = screen.getByTestId("row").element();
    const markup = markupOf([...row.children]);
    expect(markup).not.toMatch(/platform-|pe-demo|data-zen-src|data-snippet|9:41|«r7»/);
    expect(markup).toContain('<span id="demo-label" class="zen-demo-label">Plan</span>');
    expect(markup).toContain('<input aria-labelledby="demo-label" value="Pro">');
    expect(markup).toContain('href="#demo-label"');
    expect(markup.split("\n")[0]).toMatch(/^<div class="zen-stack[^"]*"/);
    const snippet = htmlSnippet(row, { markupOnly: true });
    expect(snippet).toContain('data-breakpoint="mobile"');
    expect(snippet).toContain("Markup only");
    expect(snippet).toContain('<link rel="stylesheet" href="/node_modules/@zen-ds/react/dist/styles.css">');
  });

  it("shows the specimen's HTML in the code view, with the markup-only note for a stateful component", async () => {
    let row: HTMLElement | null = null;
    const specimen = () => row;
    const screen = await render(
      <ZenProvider>
        <div ref={(element) => { row = element; }}><Button level="primary">Save</Button><Checkbox label="Remember me" /></div>
        <SnippetSpecimenContext value={specimen}>
          <SnippetCode code={`import { Button } from "@zen-ds/react";\n\n<Button level="primary">Save</Button>`} />
          <SnippetCode code={`import { Checkbox } from "@zen-ds/react";\n\n<Checkbox label="Remember me" />`} />
        </SnippetSpecimenContext>
      </ZenProvider>,
    );
    setCodeLanguage("html");
    const views = screen.container.querySelectorAll(".studio-code");
    await expect.poll(() => views[0]?.textContent ?? "").toContain('<button type="button" class="zen-button"');
    expect(views[0].textContent).not.toContain("Markup only");
    await expect.poll(() => views[1]?.textContent ?? "").toContain("Markup only");
    await expect.element(screen.getByRole("button", { name: "Copy code" }).first()).toBeVisible();
  });
});

