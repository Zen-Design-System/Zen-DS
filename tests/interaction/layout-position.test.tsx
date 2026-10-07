/**
 * Layout position, effects and corners (2026-10-03, spec docs/research/studio-position-effects-radius-spec-2026-10-03.md
 * §3.7): Figma "Ignore auto layout" + constraints on Stack, Grid and Box, Box `effectStyle` gating, Box `clip`,
 * per-corner radius on Box and Image, and the Card theme="shadow" surface="alt" fix. Unset props render nothing, so
 * existing pages keep their exact output.
 */
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Box, Card, Grid, Image, Stack, boxEffectStyles, boxSurfaces } from "../../src/index";

/** 80 × 20 px of content, so an absolute layer has something to hug. */
const Content = () => <div style={{ width: 80, height: 20 }} />;

async function mount(ui: ReactElement) {
  const screen = await render(ui);
  return (id: string) => screen.getByTestId(id).element() as HTMLElement;
}

/** The child's box relative to the frame's border box (the frame has no border). */
function offsets(frame: HTMLElement, child: HTMLElement) {
  const f = frame.getBoundingClientRect();
  const c = child.getBoundingClientRect();
  return { left: c.left - f.left, right: f.right - c.right, top: c.top - f.top, bottom: f.bottom - c.bottom, width: c.width, height: c.height };
}

describe("Position: constraints on a Box frame (400 × 300)", () => {
  const frame = (child: ReactElement) => <Box width={400} height={300} data-testid="frame">{child}</Box>;

  it("pins left, right and left-right on the Spacing/Padding offsets", async () => {
    const get = await mount(
      <Stack gap="none">
        {frame(<Box position="absolute" constraintX="left" insetLeft="sm" data-testid="left"><Content /></Box>)}
        <Box width={400} height={300} data-testid="frame-r"><Box position="absolute" constraintX="right" insetRight="md" data-testid="right"><Content /></Box></Box>
        <Box width={400} height={300} data-testid="frame-lr"><Box position="absolute" constraintX="left-right" insetLeft="sm" insetRight="md" data-testid="lr"><Content /></Box></Box>
      </Stack>,
    );
    expect(offsets(get("frame"), get("left"))).toMatchObject({ left: 12, top: 0, width: 80 });
    expect(offsets(get("frame-r"), get("right"))).toMatchObject({ right: 16, top: 0, width: 80 });
    expect(offsets(get("frame-lr"), get("lr"))).toMatchObject({ left: 12, right: 16, width: 400 - 12 - 16 });
  });

  it("pins top, bottom and top-bottom", async () => {
    const get = await mount(
      <Stack gap="none">
        <Box width={400} height={300} data-testid="f1"><Box position="absolute" constraintY="top" insetTop="xs" data-testid="top"><Content /></Box></Box>
        <Box width={400} height={300} data-testid="f2"><Box position="absolute" constraintY="bottom" insetBottom="lg" data-testid="bottom"><Content /></Box></Box>
        <Box width={400} height={300} data-testid="f3"><Box position="absolute" constraintY="top-bottom" insetTop="xs" insetBottom="lg" data-testid="tb"><Content /></Box></Box>
      </Stack>,
    );
    expect(offsets(get("f1"), get("top"))).toMatchObject({ top: 8, left: 0, height: 20 });
    expect(offsets(get("f2"), get("bottom"))).toMatchObject({ bottom: 20, height: 20 });
    expect(offsets(get("f3"), get("tb"))).toMatchObject({ top: 8, bottom: 20, height: 300 - 8 - 20 });
  });

  it("centres exactly, hugging its content or keeping a Fixed width, and ignores the offsets", async () => {
    const get = await mount(
      <Stack gap="none">
        {frame(<Box position="absolute" constraintX="center" constraintY="center" insetLeft="xl" insetTop="xl" data-testid="hug"><Content /></Box>)}
        <Box width={400} height={300} data-testid="frame-fixed"><Box position="absolute" constraintX="center" constraintY="center" width={120} height={60} data-testid="fixed"><Content /></Box></Box>
      </Stack>,
    );
    expect(offsets(get("frame"), get("hug"))).toMatchObject({ left: 160, right: 160, top: 140, bottom: 140, width: 80, height: 20 });
    expect(offsets(get("frame-fixed"), get("fixed"))).toMatchObject({ left: 140, top: 120, width: 120, height: 60 });
  });

  it("lets left-right and top-bottom override a Fixed width and height", async () => {
    const get = await mount(frame(<Box position="absolute" constraintX="left-right" constraintY="top-bottom" width={120} height={60} insetLeft="sm" insetRight="sm" data-testid="child"><Content /></Box>));
    expect(offsets(get("frame"), get("child"))).toMatchObject({ width: 400 - 24, height: 300 });
  });

  it("measures from the parent's padding box, as Figma ignores the frame's padding", async () => {
    const get = await mount(<Box width={400} height={300} padding="xl" data-testid="frame"><Box position="absolute" constraintX="right" constraintY="bottom" data-testid="child"><Content /></Box></Box>);
    expect(offsets(get("frame"), get("child"))).toMatchObject({ right: 0, bottom: 0 });
  });

  it("falls back to left / top for an unknown constraint", async () => {
    const get = await mount(frame(<Box position="absolute" constraintX={"scale" as never} constraintY={"scale" as never} insetLeft="sm" insetTop="sm" data-testid="child"><Content /></Box>));
    expect(get("child").dataset.constraintX).toBe("left");
    expect(get("child").dataset.constraintY).toBe("top");
    expect(offsets(get("frame"), get("child"))).toMatchObject({ left: 12, top: 12 });
  });
});

describe("Position: parents and nesting", () => {
  it("never inherits a parent layer's insets", async () => {
    const get = await mount(
      <Box width={400} height={300} data-testid="frame">
        <Box position="absolute" insetLeft="xl" insetTop="xl" width={200} height={100} data-testid="outer">
          <Box position="absolute" data-testid="inner"><Content /></Box>
        </Box>
      </Box>,
    );
    expect(offsets(get("frame"), get("outer"))).toMatchObject({ left: 24, top: 24 });
    expect(offsets(get("outer"), get("inner"))).toMatchObject({ left: 0, top: 0 });
    expect(get("inner").style.getPropertyValue("--zen-layout-inset-left")).toBe("0px");
  });

  it("is not stretched by a column Stack, alignSelf or a fillChildren align=stretch parent", async () => {
    const get = await mount(
      <Stack gap="none">
        <Stack width={400} height={200} data-testid="column"><Box position="absolute" data-testid="a"><Content /></Box></Stack>
        <Stack width={400} height={200} data-testid="column-self"><Box position="absolute" alignSelf="stretch" data-testid="b"><Content /></Box></Stack>
        <Stack width={400} height={200} fillChildren align="stretch" data-testid="fill"><Box position="absolute" constraintX="center" constraintY="center" data-testid="c"><Content /></Box></Stack>
        <Stack direction="row" width={400} height={200} fillChildren align="stretch" data-testid="row"><Box position="absolute" constraintX="center" constraintY="center" data-testid="d"><Content /></Box></Stack>
      </Stack>,
    );
    expect(get("a").getBoundingClientRect().width).toBe(80);
    expect(get("b").getBoundingClientRect().width).toBe(80);
    expect(offsets(get("fill"), get("c"))).toMatchObject({ left: 160, top: 90, width: 80, height: 20 });
    expect(offsets(get("row"), get("d"))).toMatchObject({ left: 160, top: 90, width: 80, height: 20 });
  });

  it("keeps a top-bottom layer pinned when alignSelf is start, center or end (the align-self reset)", async () => {
    // An absolute box's align-self aligns it in the block axis between its insets: without position.css's reset a
    // top-bottom layer with alignSelf would collapse to its content height instead of spanning the two insets.
    const get = await mount(
      <Stack gap="none">
        {(["start", "center", "end"] as const).map((self) => (
          <Stack key={self} gap="none">
            <Stack width={400} height={200} data-testid={`column-${self}`}><Box position="absolute" alignSelf={self} constraintY="top-bottom" insetTop="sm" insetBottom="sm" data-testid={`a-${self}`}><Content /></Box></Stack>
            <Stack direction="row" width={400} height={200} data-testid={`row-${self}`}><Box position="absolute" alignSelf={self} constraintY="top-bottom" insetTop="sm" insetBottom="sm" data-testid={`b-${self}`}><Content /></Box></Stack>
            <Grid columns={2} width={400} height={200} data-testid={`grid-${self}`}><Box position="absolute" alignSelf={self} constraintY="top-bottom" insetTop="sm" insetBottom="sm" data-testid={`c-${self}`}><Content /></Box><Content /></Grid>
          </Stack>
        ))}
      </Stack>,
    );
    for (const self of ["start", "center", "end"]) {
      expect(offsets(get(`column-${self}`), get(`a-${self}`)), `column ${self}`).toMatchObject({ top: 12, bottom: 12, height: 176 });
      expect(offsets(get(`row-${self}`), get(`b-${self}`)), `row ${self}`).toMatchObject({ top: 12, bottom: 12, height: 176 });
      expect(offsets(get(`grid-${self}`), get(`c-${self}`)), `grid ${self}`).toMatchObject({ top: 12, bottom: 12, height: 176 });
    }
  });

  it("takes a Stack or Grid parent as its frame, and leaves gap and Hug to the in-flow children", async () => {
    const get = await mount(
      <Stack gap="none">
        <Stack direction="row" gap="md" width="hug" data-testid="row">
          <Box position="absolute" constraintX="right" constraintY="bottom" data-testid="pinned"><Content /></Box>
          <Content />
          <Content />
        </Stack>
        <Grid columns={2} width={400} padding="md" data-testid="grid"><Box position="absolute" constraintX="right" constraintY="top" insetRight="sm" data-testid="in-grid"><Content /></Box><Content /></Grid>
      </Stack>,
    );
    expect(get("row").getBoundingClientRect().width).toBe(80 + 16 + 80);
    expect(offsets(get("row"), get("pinned"))).toMatchObject({ right: 0, bottom: 0 });
    expect(offsets(get("grid"), get("in-grid"))).toMatchObject({ right: 12, top: 0 });
  });

  it("uses a Card parent as the containing block (its edge, not the padded content slot)", async () => {
    const get = await mount(
      <Box width={300}>
        <Card data-testid="card"><Box position="absolute" constraintX="right" constraintY="top" data-testid="child"><Content /></Box><Content /></Card>
      </Box>,
    );
    expect(offsets(get("card"), get("child"))).toMatchObject({ right: 0, top: 0 });
  });

  it("paints an in-flow sibling written after an absolute layer above it (Figma Last on top)", async () => {
    const get = await mount(
      <Box width={300} height={160} data-testid="frame">
        <Box position="absolute" constraintX="left-right" constraintY="top-bottom" surface="subtle" data-testid="media" />
        <Box padding="md" data-testid="content"><Content /></Box>
      </Box>,
    );
    const rect = get("content").getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + 20, rect.top + 20);
    expect(hit && get("content").contains(hit)).toBe(true);
    // The parent frame became the containing block; the earlier layer is untouched.
    expect(getComputedStyle(get("frame")).position).toBe("relative");
    expect(getComputedStyle(get("media")).position).toBe("absolute");
  });
});

describe("Effects: effectStyle gating and clip", () => {
  it("draws a drop shadow on surface only, never on pale, surface-alt or no fill", async () => {
    const get = await mount(
      <Stack>
        <Box surface="surface" effectStyle="Shadow/Bottom/Level-1" data-testid="surface"><Content /></Box>
        <Box surface="surface" effectStyle="Shadow/Top/Level-2" data-testid="top"><Content /></Box>
        <Box surface="pale" effectStyle="Shadow/Bottom/Level-1" data-testid="pale"><Content /></Box>
        <Box surface="subtle" effectStyle="Shadow/Bottom/Level-1" data-testid="subtle"><Content /></Box>
        <Box surface="surface-alt" effectStyle="Shadow/Bottom/Level-1" data-testid="alt"><Content /></Box>
        <Box effectStyle="Shadow/Bottom/Level-1" data-testid="none"><Content /></Box>
      </Stack>,
    );
    expect(get("surface").dataset.effectStyle).toBe("shadow-bottom-level-1");
    expect(getComputedStyle(get("surface")).boxShadow).not.toBe("none");
    expect(getComputedStyle(get("top")).boxShadow).toContain("-12px");
    for (const id of ["pale", "subtle", "alt", "none"]) expect(getComputedStyle(get(id)).boxShadow, id).toBe("none");
  });

  it("gates every effect style on its fill and paints the matching generated token (§9)", async () => {
    // The runtime twin of effects.selftest.mjs's CSS assertion, so the Build-QA gate's Vitest step catches a lost gate:
    // a drop shadow only on surface="surface", the blur only on subtle or pale, nothing on any other fill.
    const key = (style: string) => style.toLowerCase().replace(/\//g, "-");
    const get = await mount(
      <Stack>
        {boxEffectStyles.flatMap((style) =>
          boxSurfaces.map((surface) => <Box key={`${style}-${surface}`} surface={surface} effectStyle={style} data-testid={`${key(style)}@${surface}`}><Content /></Box>),
        )}
        {boxEffectStyles.map((style) => (
          <div key={style} data-testid={`token-${key(style)}`}
            style={style === "Effect/Overlay" ? { backdropFilter: "var(--zen-style-effect-overlay-backdrop-filter)" } : { boxShadow: `var(--zen-style-${key(style)}-shadow)` }} />
        ))}
      </Stack>,
    );
    for (const style of boxEffectStyles) {
      const token = getComputedStyle(get(`token-${key(style)}`));
      for (const surface of boxSurfaces) {
        const computed = getComputedStyle(get(`${key(style)}@${surface}`));
        const label = `${style} on ${surface}`;
        if (style === "Effect/Overlay") {
          expect(computed.backdropFilter, label).toBe(surface === "subtle" || surface === "pale" ? token.backdropFilter : "none");
          expect(computed.boxShadow, label).toBe("none");
        } else {
          expect(computed.boxShadow, label).toBe(surface === "surface" ? token.boxShadow : "none");
          expect(computed.backdropFilter, label).toBe("none");
        }
      }
      expect(style === "Effect/Overlay" ? token.backdropFilter : token.boxShadow, `${style} token`).not.toBe("none");
    }
  });

  it("blurs behind a pale or subtle fill only", async () => {
    const get = await mount(
      <Stack>
        <Box surface="pale" effectStyle="Effect/Overlay" data-testid="pale"><Content /></Box>
        <Box surface="subtle" effectStyle="Effect/Overlay" data-testid="subtle"><Content /></Box>
        <Box surface="surface" effectStyle="Effect/Overlay" data-testid="surface"><Content /></Box>
      </Stack>,
    );
    expect(getComputedStyle(get("pale")).backdropFilter).toBe("blur(50px)");
    expect(getComputedStyle(get("subtle")).backdropFilter).toBe("blur(50px)");
    expect(getComputedStyle(get("surface")).backdropFilter).toBe("none");
    expect(getComputedStyle(get("surface")).boxShadow).toBe("none");
  });

  it("clips content with overflow: clip only when clip is set", async () => {
    const get = await mount(
      <Stack>
        <Box radius="xl" clip data-testid="clip"><Content /></Box>
        <Box radius="xl" data-testid="free"><Content /></Box>
      </Stack>,
    );
    expect(get("clip").dataset.clip).toBe("true");
    expect(getComputedStyle(get("clip")).overflow).toBe("clip");
    expect(getComputedStyle(get("free")).overflow).toBe("visible");
  });

  it("drops the Card shadow on Surface/Alt and keeps it on the default surface", async () => {
    const get = await mount(
      <Stack>
        <Card theme="shadow" data-testid="default"><Content /></Card>
        <Card theme="shadow" surface="alt" data-testid="alt"><Content /></Card>
        <Card theme="shadow" surface="alt" selected data-testid="alt-selected"><Content /></Card>
      </Stack>,
    );
    expect(getComputedStyle(get("default")).boxShadow).toContain("-2px");
    expect(getComputedStyle(get("alt")).boxShadow).toBe("none");
    const selected = getComputedStyle(get("alt-selected")).boxShadow;
    expect(selected).toMatch(/2px inset$/);
    expect(selected).not.toContain("-2px");
  });
});

describe("Corner radius per corner", () => {
  it("overrides single corners of a Box and keeps radius on the others", async () => {
    const get = await mount(
      <Stack>
        <Box radius="xl" radiusBottomRight="xs" data-testid="tail"><Content /></Box>
        <Box radiusTopLeft="3xl" radiusTopRight="3xl" data-testid="sheet"><Content /></Box>
      </Stack>,
    );
    const tail = getComputedStyle(get("tail"));
    expect([tail.borderTopLeftRadius, tail.borderTopRightRadius, tail.borderBottomRightRadius, tail.borderBottomLeftRadius]).toEqual(["20px", "20px", "4px", "20px"]);
    const sheet = getComputedStyle(get("sheet"));
    expect([sheet.borderTopLeftRadius, sheet.borderTopRightRadius, sheet.borderBottomRightRadius, sheet.borderBottomLeftRadius]).toEqual(["28px", "28px", "0px", "0px"]);
  });

  it("keeps md on the Image corners that are not set", async () => {
    const screen = await render(<Image alt="Harbour at dawn" radiusTopLeft="2xl" />);
    const frame = screen.container.querySelector(".zen-image__frame") as HTMLElement;
    const style = getComputedStyle(frame);
    expect([style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]).toEqual(["24px", "12px", "12px", "12px"]);
  });
});

describe("Unset props render nothing new", () => {
  it("adds no data attribute or custom property to Stack, Grid, Box and Image", async () => {
    const screen = await render(
      <Stack data-testid="stack">
        <Grid data-testid="grid" />
        <Box data-testid="box" radius="lg" />
        <Box data-testid="static" position="static" constraintX="right" insetRight="sm" />
        <Image alt="Harbour at dawn" />
      </Stack>,
    );
    for (const id of ["stack", "grid", "box", "static"]) {
      const element = screen.getByTestId(id).element() as HTMLElement;
      for (const name of ["data-position", "data-constraint-x", "data-constraint-y", "data-effect-style", "data-clip"]) expect(element.hasAttribute(name), `${id} ${name}`).toBe(false);
      expect(element.getAttribute("style") ?? "", id).not.toContain("--zen-layout-inset");
    }
    expect((screen.getByTestId("box").element() as HTMLElement).style.getPropertyValue("--zen-box-radius")).toBe("var(--zen-corner-radius-large)");
    const image = screen.container.querySelector(".zen-image") as HTMLElement;
    expect(image.style.getPropertyValue("--zen-image-radius")).toBe("var(--zen-corner-radius-base)");
  });
});
