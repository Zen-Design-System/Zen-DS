/**
 * Image `frame`: the default frame is Neutral/Pale with a 1px Border/Neutral/Pale hairline (a light photo keeps its
 * edge); frame={false} is for a cut-out picture on a transparent background (the E1 mascot, 2026-10-20: the user
 * approved it), with no fill and no hairline around it. Real browser (Chromium).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Image, ZenProvider } from "../../src/index";

const pixel = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

const frameOf = (root: Element) => root.querySelector<HTMLElement>(".zen-image__frame")!;

describe("Image frame", () => {
  it("draws the Neutral/Pale frame and its hairline by default", async () => {
    const { container } = await render(<ZenProvider><Image src={pixel} alt="A white square" ratio="1:1" /></ZenProvider>);
    const root = container.querySelector(".zen-image")!;
    expect(root.hasAttribute("data-frame")).toBe(false);
    expect(getComputedStyle(frameOf(root)).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(frameOf(root), "::after").boxShadow).not.toBe("none");
  });

  it("frame={false}: no fill and no hairline, so a cut-out shows on the page itself", async () => {
    const { container } = await render(<ZenProvider><Image src={pixel} alt="" ratio="1:1" fit="contain" frame={false} /></ZenProvider>);
    const root = container.querySelector(".zen-image")!;
    expect(root.getAttribute("data-frame")).toBe("none");
    expect(getComputedStyle(frameOf(root)).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(frameOf(root), "::after").content).toBe("none");
  });
});
