/**
 * Untrusted content: RichTextField sanitises the HTML it is given (stored values may come from another user), and a
 * Link that opens a new tab never hands the page to it.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Link, RichTextField, ZenProvider } from "../../src/index";
import { sanitizeHtml } from "../../src/components/_shared/sanitize-html";

describe("sanitizeHtml", () => {
  it("drops scripts, handlers, dangerous URLs and unknown styles", () => {
    const out = sanitizeHtml(
      '<p onclick="x()">Hi<script>alert(1)</script></p><img src="x" onerror="alert(1)"><a href="java\tscript:alert(1)">a</a>'
      + '<a href="https://zen.design" target="_blank">b</a><iframe src="https://evil"></iframe><p style="text-align: center; background: url(x)">c</p>',
    );
    expect(out).not.toMatch(/script|onerror|onclick|iframe|url\(/i);
    expect(out).toContain('<a href="https://zen.design" target="_blank" rel="noopener noreferrer">b</a>');
    expect(out).toContain('style="text-align: center"');
    expect(out).toContain("<a>a</a>");
  });

  it("keeps the editor's own formatting", () => {
    const html = "<h2>Title</h2><p><b>bold</b> <i>it</i> <u>u</u> <s>s</s></p><ul><li>one</li></ul><ol><li>two</li></ol>";
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("unwraps unknown tags and keeps their text", () => {
    expect(sanitizeHtml("<p><font color=red>kept</font></p>")).toBe("<p>kept</p>");
  });
});

describe("RichTextField value", () => {
  it("never puts an event handler from the value into the DOM", async () => {
    const screen = await render(<ZenProvider><RichTextField label="Notes" value={'<p>Hi</p><img src="x" onerror="window.__zenXss=1">'} /></ZenProvider>);
    const editor = screen.container.querySelector("[contenteditable]")!;
    expect(editor.innerHTML).not.toContain("onerror");
    expect((window as unknown as { __zenXss?: number }).__zenXss).toBeUndefined();
  });
});

describe("Link target", () => {
  it("adds noopener noreferrer to any new-tab link, not only external ones", async () => {
    const screen = await render(<ZenProvider><Link href="https://zen.design" target="_blank" rel="author">Zen</Link></ZenProvider>);
    expect(screen.container.querySelector("a")!.getAttribute("rel")).toBe("author noopener noreferrer");
  });
});
