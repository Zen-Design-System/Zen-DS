/**
 * Layout and Text props for the examples' last classNames (user, 2026-10-13): Grid `stackBelow` (one column while the
 * Grid itself is narrow), Stack / Box `scroll` (Figma Overflow scrolling), Box `surface="canvas"`, Text / Heading
 * `wrap={false}` (Figma Auto width) and `tabularNumbers` (Figma Number: Tabular), and the focus ring of a text that
 * takes focus (tabIndex -1). Unset, each renders nothing new.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Box, Grid, Heading, Stack, Text } from "../../src/index";

const Cell = () => <div style={{ height: 20 }} />;
const columnsOf = (element: Element) => getComputedStyle(element).gridTemplateColumns.split(" ").length;

describe("Grid stackBelow", () => {
  it("shows one column while the Grid is narrower than stackBelow, its columns once it is wider", async () => {
    const screen = await render(
      <Stack gap="none">
        <div style={{ width: 500 }}><Grid columns="minmax(0, 1fr) minmax(0, 2fr)" stackBelow={640} data-testid="narrow"><Cell /><Cell /></Grid></div>
        <div style={{ width: 800 }}><Grid columns="minmax(0, 1fr) minmax(0, 2fr)" stackBelow={640} data-testid="wide"><Cell /><Cell /></Grid></div>
      </Stack>,
    );
    const narrow = screen.getByTestId("narrow").element();
    const wide = screen.getByTestId("wide").element();
    expect(narrow.getAttribute("data-stacked")).toBe("true");
    expect(columnsOf(narrow)).toBe(1);
    expect(wide.getAttribute("data-stacked")).toBeNull();
    expect(columnsOf(wide)).toBe(2);
  });

  it("follows a resize of its own box", async () => {
    const screen = await render(<div data-testid="host" style={{ width: 800 }}><Grid columns={2} stackBelow={640} data-testid="grid"><Cell /><Cell /></Grid></div>);
    const host = screen.getByTestId("host").element() as HTMLElement;
    const grid = screen.getByTestId("grid").element();
    expect(columnsOf(grid)).toBe(2);
    host.style.width = "400px";
    await expect.poll(() => columnsOf(grid)).toBe(1);
  });
});

describe("Stack and Box scroll, Box surface canvas", () => {
  it("scrolls along one axis and keeps the scroll inside", async () => {
    const screen = await render(
      <Stack>
        <Stack scroll="y" maxHeight={40} data-testid="column"><Cell /><Cell /><Cell /></Stack>
        <Box scroll="x" data-testid="row" surface="canvas"><div style={{ width: 2000, height: 10 }} /></Box>
        <Box data-testid="plain"><Cell /></Box>
      </Stack>,
    );
    const column = getComputedStyle(screen.getByTestId("column").element());
    const row = getComputedStyle(screen.getByTestId("row").element());
    const plain = screen.getByTestId("plain").element();
    expect([column.overflowY, column.overscrollBehaviorY]).toEqual(["auto", "contain"]);
    expect([row.overflowX, row.overscrollBehaviorX]).toEqual(["auto", "contain"]);
    expect(row.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect([plain.getAttribute("data-scroll"), getComputedStyle(plain).overflowY]).toEqual([null, "visible"]);
  });
});

describe("Text and Heading wrap, tabularNumbers and focus", () => {
  it("keeps a text on one line, gives digits one width, and adds nothing when unset", async () => {
    const screen = await render(
      <Stack>
        <Text wrap={false} tabularNumbers data-testid="time">10:45 am</Text>
        <Heading level={3} wrap={false} data-testid="heading">Q3 revenue</Heading>
        <Text data-testid="plain">Plain</Text>
      </Stack>,
    );
    const time = getComputedStyle(screen.getByTestId("time").element());
    expect([time.whiteSpace, time.fontVariantNumeric]).toEqual(["nowrap", "tabular-nums"]);
    expect(getComputedStyle(screen.getByTestId("heading").element()).whiteSpace).toBe("nowrap");
    const plain = screen.getByTestId("plain").element();
    expect([plain.getAttribute("data-wrap"), plain.getAttribute("data-numbers")]).toEqual([null, null]);
  });

  it("draws the focus ring around a text that takes focus (tabIndex -1), not the browser outline", async () => {
    const screen = await render(<Text tabIndex={-1} data-testid="count">12 results</Text>);
    const count = screen.getByTestId("count").element() as HTMLElement;
    expect(getComputedStyle(count).position).toBe("relative");
    count.focus();
    expect(getComputedStyle(count).outlineStyle).toBe("none");
  });
});
