/**
 * Responsive Layout props (P2 of docs/research/studio-responsive-breakpoints-2026-10-26.md): Stack, Grid and Box take
 * `{ desktop?, tablet?, mobile? }` for their structure props and `hideOn`, resolved at the frame's breakpoint (the
 * nearest ZenProvider's or a frame's `modes`), desktop → tablet → mobile. Real browser (Chromium).
 */
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Box, Grid, Stack, ZenProvider, resolveAt } from "../../src/index";

type At = "desktop" | "tablet" | "mobile";
const breakpoints: At[] = ["desktop", "tablet", "mobile"];
const style = (testId: string) => getComputedStyle(document.querySelector(`[data-testid="${testId}"]`) as HTMLElement);
const columnCount = (testId: string) => style(testId).gridTemplateColumns.split(" ").filter(Boolean).length;
const items = (count: number) => Array.from({ length: count }, (_, index) => <div key={index}>Item {index + 1}</div>);
const at = (breakpoint: At, children: ReactNode) => <ZenProvider breakpoint={breakpoint}><div style={{ width: 960 }}>{children}</div></ZenProvider>;

describe("resolveAt", () => {
  it("keeps a plain value and inherits desktop → tablet → mobile", () => {
    expect(resolveAt("row", "mobile")).toBe("row");
    expect(resolveAt(undefined, "mobile")).toBeUndefined();
    const value = { desktop: "row", mobile: "column" } as const;
    expect(resolveAt(value, "desktop")).toBe("row");
    expect(resolveAt(value, "tablet")).toBe("row");
    expect(resolveAt(value, "mobile")).toBe("column");
    // No breakpoint known (outside any ZenProvider): desktop.
    expect(resolveAt(value, undefined)).toBe("row");
    // Only a narrower key set: the wider breakpoints take it (Grid `columns` did the same).
    expect(resolveAt({ mobile: 1 }, "desktop")).toBe(1);
    expect(resolveAt({ tablet: 2, mobile: 1 }, "desktop")).toBe(2);
    expect(resolveAt({ desktop: false, tablet: true }, "mobile")).toBe(true);
  });
});

describe("Stack: responsive props at the three breakpoints", () => {
  const row = { desktop: "row", mobile: "column" } as const;
  for (const breakpoint of breakpoints) {
    it(`direction ${JSON.stringify(row)} at ${breakpoint}`, async () => {
      await render(at(breakpoint, <Stack data-testid="stack" direction={row}>{items(2)}</Stack>));
      const expected = breakpoint === "mobile" ? "column" : "row";
      expect(document.querySelector('[data-testid="stack"]')?.getAttribute("data-direction")).toBe(expected);
      expect(style("stack").flexDirection).toBe(expected);
      // A row's default cross alignment follows the resolved direction.
      expect(style("stack").alignItems).toBe(expected === "row" ? "center" : "normal");
    });
  }

  it("gap, padding, paddingX / paddingY, align, justify and wrap resolve per breakpoint", async () => {
    await render(
      at("mobile", (
        <>
          <Stack data-testid="responsive" direction="row" gap={{ desktop: "xl", mobile: "2xs" }} padding={{ desktop: "xl", mobile: "xs" }} paddingY={{ tablet: "lg" }} align={{ desktop: "center", mobile: "end" }} justify={{ desktop: "between", mobile: "start" }} wrap={{ desktop: false, tablet: true }}>{items(2)}</Stack>
          <Stack data-testid="mobile" direction="row" gap="2xs" padding="xs" paddingY="lg">{items(2)}</Stack>
        </>
      )),
    );
    expect(style("responsive").columnGap).toBe(style("mobile").columnGap);
    expect(style("responsive").paddingLeft).toBe(style("mobile").paddingLeft);
    // paddingY has only a tablet key: mobile inherits it.
    expect(style("responsive").paddingTop).toBe(style("mobile").paddingTop);
    expect(style("responsive").alignItems).toBe("flex-end");
    expect(style("responsive").justifyContent).toBe("flex-start");
    expect(style("responsive").flexWrap).toBe("wrap");
  });

  it("hideOn hides the stack at those breakpoints and keeps it in the DOM", async () => {
    await render(
      <>
        {breakpoints.map((breakpoint) => (
          <ZenProvider key={breakpoint} breakpoint={breakpoint}>
            <Stack data-testid={`panel-${breakpoint}`} hideOn={["tablet", "mobile"]}>Panel</Stack>
          </ZenProvider>
        ))}
      </>,
    );
    expect(style("panel-desktop").display).toBe("flex");
    expect(style("panel-tablet").display).toBe("none");
    expect(style("panel-mobile").display).toBe("none");
    expect(document.querySelector('[data-testid="panel-mobile"]')?.getAttribute("data-hidden")).toBe("true");
  });

  it("outside any ZenProvider takes the desktop value", async () => {
    await render(<Stack data-testid="stack" direction={{ desktop: "row", mobile: "column" }} hideOn={["mobile"]}>{items(2)}</Stack>);
    expect(style("stack").flexDirection).toBe("row");
    expect(style("stack").display).toBe("flex");
  });
});

describe("Grid: responsive gap, padding, columns and hideOn", () => {
  for (const breakpoint of breakpoints) {
    it(`columns { mobile: 1, tablet: 2, desktop: 3 } and gaps at ${breakpoint}`, async () => {
      await render(at(breakpoint, (
        <>
          <Grid data-testid="grid" columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap={{ desktop: "xl", mobile: "xs" }} columnGap={{ tablet: "2xs" }} padding={{ desktop: "lg", mobile: "none" }}>{items(6)}</Grid>
          <Grid data-testid="plain" columns={1} gap={breakpoint === "mobile" ? "xs" : "xl"} columnGap="2xs" padding={breakpoint === "mobile" ? "none" : "lg"}>{items(1)}</Grid>
        </>
      )));
      expect(columnCount("grid")).toBe({ desktop: 3, tablet: 2, mobile: 1 }[breakpoint]);
      expect(style("grid").rowGap).toBe(style("plain").rowGap);
      expect(style("grid").columnGap).toBe(style("plain").columnGap);
      expect(style("grid").paddingTop).toBe(style("plain").paddingTop);
    });
  }

  it("hideOn hides the grid", async () => {
    await render(at("mobile", <Grid data-testid="grid" hideOn={["mobile"]}>{items(2)}</Grid>));
    expect(style("grid").display).toBe("none");
  });
});

describe("Box: responsive padding and hideOn", () => {
  for (const breakpoint of breakpoints) {
    it(`padding { desktop: "xl", mobile: "xs" }, paddingX { tablet: "md" } at ${breakpoint}`, async () => {
      await render(at(breakpoint, (
        <>
          <Box data-testid="box" padding={{ desktop: "xl", mobile: "xs" }} paddingX={{ tablet: "md" }}>Box</Box>
          {/* paddingX has only a tablet key: desktop takes it too (no wider key), mobile inherits it. */}
          <Box data-testid="plain" padding={breakpoint === "mobile" ? "xs" : "xl"} paddingX="md">Box</Box>
        </>
      )));
      expect(style("box").paddingTop).toBe(style("plain").paddingTop);
      expect(style("box").paddingLeft).toBe(style("plain").paddingLeft);
    });
  }

  it("hideOn hides the box and keeps it in the DOM", async () => {
    await render(at("tablet", <Box data-testid="box" hideOn={["tablet"]}>Box</Box>));
    expect(style("box").display).toBe("none");
  });
});

describe("Nested modes={{ breakpoint }}", () => {
  it("a mobile frame on a desktop page lays itself and its content out as mobile", async () => {
    await render(at("desktop", (
      <Stack data-testid="frame" modes={{ breakpoint: "mobile" }} direction={{ desktop: "row", mobile: "column" }} hideOn={["desktop"]}>
        <Stack data-testid="inner" direction={{ desktop: "row", mobile: "column" }}>{items(2)}</Stack>
        <Grid data-testid="grid" columns={{ mobile: 1, desktop: 3 }}>{items(3)}</Grid>
      </Stack>
    )));
    // The frame's own props resolve at its own breakpoint.
    expect(style("frame").flexDirection).toBe("column");
    expect(style("frame").display).toBe("flex");
    expect(style("inner").flexDirection).toBe("column");
    expect(columnCount("grid")).toBe(1);
  });

  it("a desktop frame on a mobile page lays its content out as desktop", async () => {
    await render(at("mobile", (
      <Box modes={{ breakpoint: "desktop" }}>
        <Stack data-testid="inner" direction={{ desktop: "row", mobile: "column" }}>{items(2)}</Stack>
        <Grid data-testid="grid" columns={{ mobile: 1, desktop: 3 }}>{items(3)}</Grid>
        <Box data-testid="hidden" hideOn={["mobile"]}>Shown on desktop</Box>
      </Box>
    )));
    expect(style("inner").flexDirection).toBe("row");
    expect(columnCount("grid")).toBe(3);
    expect(style("hidden").display).toBe("block");
  });

  it("a desktop frame on a tablet page keeps the desktop columns", async () => {
    await render(at("tablet", (
      <Box modes={{ breakpoint: "desktop" }}>
        <Grid data-testid="grid" columns={{ mobile: 1, tablet: 2, desktop: 4 }}>{items(4)}</Grid>
      </Box>
    )));
    expect(columnCount("grid")).toBe(4);
  });
});
