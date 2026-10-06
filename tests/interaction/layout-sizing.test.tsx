/**
 * Layout sizing (2026-10-03): Figma auto-layout resizing on Stack, Grid, Box and Text — Hug contents, Fill container
 * and Fixed per axis, min/max, alignSelf and Stack fillChildren — measured in row and column Stacks. Unset props render
 * no attribute and no style, so existing pages keep their exact output.
 */
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Badge, Box, Button, Chip, Grid, Heading, Segmented, Stack, Text } from "../../src/index";

/** 80 × 20 px of content, so Hug has something to measure. */
const Content = () => <div style={{ width: 80, height: 20 }} />;

async function measure(ui: ReactElement, ...ids: string[]) {
  const screen = await render(ui);
  return ids.map((id) => screen.getByTestId(id).element().getBoundingClientRect());
}

describe("Layout sizing in a row Stack", () => {
  it("hugs, fixes and fills along the row", async () => {
    const [row, hug, fixed, fill] = await measure(
      <Stack direction="row" gap="none" width={600} data-testid="row">
        <Box width="hug" data-testid="hug"><Content /></Box>
        <Box width={120} data-testid="fixed"><Content /></Box>
        <Box width="fill" data-testid="fill"><Content /></Box>
      </Stack>,
      "row", "hug", "fixed", "fill",
    );
    expect(row.width).toBe(600);
    expect(hug.width).toBe(80);
    expect(fixed.width).toBe(120);
    expect(fill.width).toBe(600 - 80 - 120);
  });

  it("shares the free space equally between Fill children, whatever their content", async () => {
    const [a, b] = await measure(
      <Stack direction="row" gap="none" width={400}>
        <Box width="fill" data-testid="a"><Content /></Box>
        <Box width="fill" data-testid="b"><div style={{ width: 160, height: 20 }} /></Box>
      </Stack>,
      "a", "b",
    );
    expect(a.width).toBe(200);
    expect(b.width).toBe(200);
  });

  it("keeps a Fixed child from shrinking and lets minWidth stop a Fill child", async () => {
    const [fixed, fill] = await measure(
      <Stack direction="row" gap="none" width={300}>
        <Box width={240} data-testid="fixed"><Content /></Box>
        <Box width="fill" minWidth={100} data-testid="fill"><Content /></Box>
      </Stack>,
      "fixed", "fill",
    );
    expect(fixed.width).toBe(240);
    expect(fill.width).toBe(100);
  });

  it("fills the height across the row and centres a Hug child with alignSelf", async () => {
    const [row, tall, fill, centred] = await measure(
      <Stack direction="row" gap="none" align="start" data-testid="row">
        <Box height={100} data-testid="tall"><Content /></Box>
        <Box height="fill" data-testid="fill"><Content /></Box>
        <Box alignSelf="center" data-testid="centred"><Content /></Box>
      </Stack>,
      "row", "tall", "fill", "centred",
    );
    expect(tall.height).toBe(100);
    expect(fill.height).toBe(row.height);
    expect(centred.top - row.top).toBe((row.height - centred.height) / 2);
  });

  it("gives every child an equal share with fillChildren, unless a child sets its own width", async () => {
    const [a, b, own] = await measure(
      <Stack direction="row" gap="none" width={500} fillChildren>
        <div data-testid="a"><Content /></div>
        <div data-testid="b"><div style={{ width: 180, height: 20 }} /></div>
        <Box width={100} data-testid="own"><Content /></Box>
      </Stack>,
      "a", "b", "own",
    );
    expect(own.width).toBe(100);
    expect(a.width).toBe(200);
    expect(b.width).toBe(200);
  });
});

describe("Layout sizing in a column Stack", () => {
  it("hugs, fixes and fills across the column", async () => {
    const [hug, fixed, fill, capped] = await measure(
      <Stack gap="none" width={500}>
        <Box width="hug" data-testid="hug"><Content /></Box>
        <Box width={200} data-testid="fixed"><Content /></Box>
        <Box width="fill" data-testid="fill"><Content /></Box>
        <Box width="fill" maxWidth={320} data-testid="capped"><Content /></Box>
      </Stack>,
      "hug", "fixed", "fill", "capped",
    );
    expect(hug.width).toBe(80);
    expect(fixed.width).toBe(200);
    expect(fill.width).toBe(500);
    expect(capped.width).toBe(320);
  });

  it("fills the column's free height and keeps a Hug or Fixed child at its size", async () => {
    const [hug, fixed, fill] = await measure(
      <Stack gap="none" height={300}>
        <Box height="hug" data-testid="hug"><Content /></Box>
        <Box height={60} data-testid="fixed"><Content /></Box>
        <Box height="fill" data-testid="fill"><Content /></Box>
      </Stack>,
      "hug", "fixed", "fill",
    );
    expect(hug.height).toBe(20);
    expect(fixed.height).toBe(60);
    expect(fill.height).toBe(300 - 20 - 60);
  });

  it("stretches a Fill child across a centred column and aligns a child with alignSelf", async () => {
    const [column, fill, end, capped, cappedEnd] = await measure(
      <Stack gap="none" width={400} align="center" data-testid="column">
        <Box width="fill" data-testid="fill"><Content /></Box>
        <Box width="hug" alignSelf="end" data-testid="end"><Content /></Box>
        <Box width="fill" maxWidth={200} data-testid="capped"><Content /></Box>
        <Box width="fill" maxWidth={200} alignSelf="end" data-testid="capped-end"><Content /></Box>
      </Stack>,
      "column", "fill", "end", "capped", "capped-end",
    );
    expect(fill.width).toBe(400);
    expect(end.right).toBe(column.right);
    // A Fill capped by maxWidth follows the column's align (center) or its own alignSelf.
    expect(capped.width).toBe(200);
    expect(capped.left - column.left).toBe(100);
    expect(cappedEnd.right).toBe(column.right);
  });

  it("sizes Text and Heading: Hug, Fixed, Fill with maxWidth, and alignSelf", async () => {
    const [column, hug, fixed, fill, heading] = await measure(
      <Stack gap="none" width={600} data-testid="column">
        <Text width="hug" data-testid="hug">Short</Text>
        <Text width={240} data-testid="fixed">A fixed-width paragraph</Text>
        <Text width="fill" maxWidth={360} data-testid="fill">A filled paragraph capped at a readable length</Text>
        <Heading level={2} width="hug" alignSelf="center" data-testid="heading">Centred</Heading>
      </Stack>,
      "column", "hug", "fixed", "fill", "heading",
    );
    expect(hug.width).toBeLessThan(100);
    expect(fixed.width).toBe(240);
    expect(fill.width).toBe(360);
    expect(Math.abs(heading.left - column.left - (column.width - heading.width) / 2)).toBeLessThan(1);
  });

  it("lets a Fill Text in a row shrink so it truncates", async () => {
    const [text] = await measure(
      <Stack direction="row" gap="none" width={200}>
        <Text width="fill" truncate data-testid="text">A long file name that does not fit on one line — Q4 marketing plan final v3.pdf</Text>
        <Box width={80}><Content /></Box>
      </Stack>,
      "text",
    );
    expect(text.width).toBe(120);
  });
});

describe("Layout sizing in a Grid", () => {
  it("fills a cell, or hugs at its start", async () => {
    const [fill, hug] = await measure(
      <Grid columns={2} gap="none" width={400}>
        <Box width="fill" data-testid="fill"><Content /></Box>
        <Box width="hug" data-testid="hug"><Content /></Box>
      </Grid>,
      "fill", "hug",
    );
    expect(fill.width).toBe(200);
    expect(hug.width).toBe(80);
  });
});

describe("Layout sizing when unset", () => {
  it("renders no sizing attribute and no extra style", async () => {
    const screen = await render(
      <>
        <Stack data-testid="stack"><Box data-testid="box">Box</Box></Stack>
        <Grid data-testid="grid"><span>Cell</span></Grid>
        <Text data-testid="text">Copy</Text>
        <Heading data-testid="heading">Title</Heading>
      </>,
    );
    for (const id of ["stack", "box", "grid", "text", "heading"]) {
      const element = screen.getByTestId(id).element() as HTMLElement;
      const names = element.getAttributeNames();
      expect(names.filter((name) => /^data-(w|h|self|min-w|max-w|min-h|max-h|fill-children)$/.test(name)), id).toEqual([]);
      expect(element.style.cssText, id).not.toMatch(/--zen-layout-/);
    }
    expect((screen.getByTestId("text").element() as HTMLElement).getAttribute("style")).toBeNull();
    expect((screen.getByTestId("heading").element() as HTMLElement).getAttribute("style")).toBeNull();
  });
});

describe("Layout sizing edge cases (review 2026-10-03)", () => {
  it("keeps a Fill child's content height in a column without a height (no collapse, no overlap)", async () => {
    const [fill, next] = await measure(
      <Stack gap="none" width={300}>
        <Box height="fill" data-testid="fill"><div style={{ height: 50 }} /></Box>
        <Box data-testid="next"><div style={{ height: 20 }} /></Box>
      </Stack>,
      "fill", "next",
    );
    expect(fill.height).toBe(50);
    expect(next.top).toBe(fill.bottom);
  });

  it("lets a Fill child shrink below its content once the column has a height of its own", async () => {
    const [fill] = await measure(
      <Stack gap="none" width={300} height={100}>
        <Box height={60}><Content /></Box>
        <Box height="fill" data-testid="fill" style={{ overflow: "auto" }}><div style={{ height: 200 }} /></Box>
      </Stack>,
      "fill",
    );
    expect(fill.height).toBe(40);
  });

  it("fillChildren in a column without a height keeps each child's content height", async () => {
    const [a, b] = await measure(
      <Stack gap="none" width={300} fillChildren>
        <div data-testid="a"><div style={{ height: 50 }} /></div>
        <div data-testid="b"><div style={{ height: 20 }} /></div>
      </Stack>,
      "a", "b",
    );
    expect(a.height).toBe(50);
    expect(b.height).toBe(20);
    expect(b.top).toBe(a.bottom);
  });

  it("fillChildren in a column with a height shares it equally", async () => {
    const [a, b] = await measure(
      <Stack gap="none" width={300} height={200} fillChildren>
        <div data-testid="a"><div style={{ height: 50 }} /></div>
        <div data-testid="b"><div style={{ height: 20 }} /></div>
      </Stack>,
      "a", "b",
    );
    expect(a.height).toBe(100);
    expect(b.height).toBe(100);
  });

  it("sizes include padding even where the app's reset leaves content-box", async () => {
    const [fixed, fill] = await measure(
      <div className="content-box-probe">
        <style>{".content-box-probe, .content-box-probe * { box-sizing: content-box; }"}</style>
        <Stack direction="row" gap="none" width={300}>
          <Box width={200} padding="xl" data-testid="fixed" />
          <Box width="fill" padding="md" data-testid="fill" />
        </Stack>
      </div>,
      "fixed", "fill",
    );
    expect(fixed.width).toBe(200);
    expect(fill.width).toBe(100);
  });

  it("fills a Grid cell's height over its own alignSelf, as in a row Stack", async () => {
    const [cell] = await measure(
      <Grid columns={2} gap="none" width={400}>
        <Box height={100}><Content /></Box>
        <Box height="fill" alignSelf="center" data-testid="cell"><Content /></Box>
      </Grid>,
      "cell",
    );
    expect(cell.height).toBe(100);
  });

  it("keeps a Fixed width in a plain flex row outside a Stack", async () => {
    const [fixed] = await measure(
      <div style={{ display: "flex", width: 300 }}>
        <Box width="fill"><div style={{ width: 400, height: 20 }} /></Box>
        <Box width={100} data-testid="fixed"><Content /></Box>
      </div>,
      "fixed",
    );
    expect(fixed.width).toBe(100);
  });

  it("keeps a Fixed width on truncating Text, and a maxWidth still caps it", async () => {
    const [fixed, capped] = await measure(
      <div style={{ width: 150 }}>
        <Text width={400} truncate data-testid="fixed">A long line of text that is wider than its box</Text>
        <Text width={400} maxWidth={120} truncate data-testid="capped">A long line of text that is wider than its box</Text>
      </div>,
      "fixed", "capped",
    );
    expect(fixed.width).toBe(400);
    expect(capped.width).toBe(120);
  });
});

describe("fillChildren with align stretch (the Studio's corner resize wrapper, 2026-10-03)", () => {
  it("stretches a Badge and a Chip (width: max-content) across the column and down its height", async () => {
    const [badge, chip] = await measure(
      <>
        <Stack gap="none" fillChildren align="stretch" width={200} height={60}><Badge data-testid="badge">New</Badge></Stack>
        <Stack gap="none" fillChildren align="stretch" width={200} height={60}><Chip variant="normal" data-testid="chip">Design</Chip></Stack>
      </>,
      "badge", "chip",
    );
    expect([badge.width, badge.height]).toEqual([200, 60]);
    expect([chip.width, chip.height]).toEqual([200, 60]);
  });

  it("keeps a Button's min-width: max-content: it fills a wide column, never shrinks below its label", async () => {
    const screen = await render(
      <>
        <Stack gap="none" fillChildren align="stretch" width={200} height={60}><Button type="submit" data-testid="wide">Send</Button></Stack>
        <Stack gap="none" fillChildren align="stretch" width={24} height={60}><Button type="submit" data-testid="narrow">Send the report</Button></Stack>
        <div><Button type="submit" data-testid="free">Send the report</Button></div>
      </>,
    );
    const box = (id: string) => screen.getByTestId(id).element().getBoundingClientRect();
    expect(box("wide").width).toBe(200);
    expect(getComputedStyle(screen.getByTestId("narrow").element()).minWidth).toBe("max-content");
    expect(box("narrow").width).toBe(box("free").width);
    expect(box("narrow").width).toBeGreaterThan(24);
  });

  it("stretches the height across a row, keeps a child's own width or height, and leaves other aligns alone", async () => {
    const [chip, own, centred] = await measure(
      <>
        <Stack direction="row" gap="none" fillChildren align="stretch" width={200} height={60}><Chip variant="normal" data-testid="chip">Design</Chip></Stack>
        <Stack gap="none" fillChildren align="stretch" width={200}><Box width={80} data-testid="own"><Content /></Box></Stack>
        <Stack gap="none" fillChildren align="center" width={200}><Badge data-testid="centred">New</Badge></Stack>
      </>,
      "chip", "own", "centred",
    );
    expect([chip.width, chip.height]).toEqual([200, 60]);
    expect(own.width).toBe(80);
    expect(centred.width).toBeLessThan(200);
  });

  it("stretches a Button's height across a row only when the row has a height of its own (round 5)", async () => {
    const [hug, fixed] = await measure(
      <>
        <Stack direction="row" gap="none" fillChildren align="stretch" width={160}><Button type="submit" data-testid="hug">Send</Button></Stack>
        <Stack direction="row" gap="none" fillChildren align="stretch" width={160} height={60}><Button type="submit" data-testid="fixed">Send</Button></Stack>
      </>,
      "hug", "fixed",
    );
    expect([hug.width, hug.height]).toEqual([160, 40]);
    expect([fixed.width, fixed.height]).toEqual([160, 60]);
  });
});

describe("fillChildren in a column without a height (the Studio's Hug wrapper, round 4)", () => {
  const options = [{ id: "day", label: "Day" }, { id: "week", label: "Week" }];

  it("keeps a Button's 40px and a Segmented's own height in a Hug or unset column", async () => {
    const screen = await render(
      <>
        <div><Button type="submit" data-testid="free-button">Send</Button></div>
        <div data-testid="free-segmented"><Segmented aria-label="Range" options={options} /></div>
        <Stack gap="none" fillChildren width="hug" data-testid="hug-button"><Button type="submit">Send</Button></Stack>
        <Stack gap="none" fillChildren width="hug" data-testid="hug-segmented"><Segmented aria-label="Range" options={options} /></Stack>
        <Stack gap="none" fillChildren width={200} height="hug" align="stretch" data-testid="stretch-button"><Button type="submit">Send</Button></Stack>
        <Stack gap="none" fillChildren width={200} height="hug" align="stretch" data-testid="stretch-segmented"><Segmented aria-label="Range" options={options} /></Stack>
      </>,
    );
    const height = (id: string) => (screen.getByTestId(id).element().firstElementChild as HTMLElement).getBoundingClientRect().height;
    const freeButton = screen.getByTestId("free-button").element().getBoundingClientRect().height;
    expect(freeButton).toBe(40);
    for (const id of ["hug-button", "stretch-button"]) {
      expect(height(id), id).toBe(40);
      expect(screen.getByTestId(id).element().getBoundingClientRect().height, id).toBe(40);
    }
    const freeSegmented = height("free-segmented");
    expect(freeSegmented).toBeGreaterThan(20);
    for (const id of ["hug-segmented", "stretch-segmented"]) expect(height(id), id).toBe(freeSegmented);
  });

  it("starts a Fill child at its content height in a column without a height, also with a minHeight", async () => {
    const [fill, next] = await measure(
      <Stack gap="none" width={300}>
        <Box height="fill" minHeight={10} data-testid="fill"><div style={{ height: 50 }} /></Box>
        <Box data-testid="next"><div style={{ height: 20 }} /></Box>
      </Stack>,
      "fill", "next",
    );
    expect(fill.height).toBe(50);
    expect(next.top).toBe(fill.bottom);
  });

  it("still shares a column's own height equally between Buttons", async () => {
    const [a, b] = await measure(
      <Stack gap="none" fillChildren align="stretch" width={200} height={200}>
        <Button type="submit" data-testid="a">One</Button>
        <Button type="submit" data-testid="b">Two</Button>
      </Stack>,
      "a", "b",
    );
    expect([a.height, b.height]).toEqual([100, 100]);
  });

  it("keeps content heights in a column with only a maxHeight, and shrinks them once it caps", async () => {
    const [button, open, a, b] = await measure(
      <>
        <Stack gap="none" fillChildren maxHeight={300} width={200}><Button type="submit" data-testid="button">One</Button></Stack>
        <Stack gap="none" maxHeight={300} width={200}><Box height="fill" data-testid="open"><div style={{ height: 50 }} /></Box></Stack>
        <Stack gap="none" fillChildren maxHeight={40} width={200}>
          <div data-testid="a" style={{ overflow: "auto" }}><div style={{ height: 50 }} /></div>
          <div data-testid="b" style={{ overflow: "auto" }}><div style={{ height: 30 }} /></div>
        </Stack>
      </>,
      "button", "open", "a", "b",
    );
    expect(button.height).toBe(40);
    expect(open.height).toBe(50);
    expect(a.height + b.height).toBe(40);
    expect(b.top).toBe(a.bottom);
  });
});

describe("An absolute layer is out of the flow (position.css): parent-aware sizing leaves it alone", () => {
  it("is not stretched or shared by a fillChildren Stack with align stretch", async () => {
    const [row, layer, column, layerInColumn] = await measure(
      <div>
        <Stack direction="row" fillChildren align="stretch" gap="none" width={300} height={80} data-testid="row">
          <Box><Content /></Box>
          <Box position="absolute" width={50} height={20} data-testid="layer" />
        </Stack>
        <Stack fillChildren align="stretch" gap="none" width={300} height={120} data-testid="column">
          <Box><Content /></Box>
          <Box position="absolute" width={60} height={30} data-testid="layer-column" />
        </Stack>
      </div>,
      "row", "layer", "column", "layer-column",
    );
    expect(row.width).toBe(300);
    expect([layer.width, layer.height]).toEqual([50, 20]);
    expect(column.height).toBe(120);
    expect([layerInColumn.width, layerInColumn.height]).toEqual([60, 30]);
  });

  it("keeps a Fill size of its own instead of the row's flex share", async () => {
    const [layer] = await measure(
      <Stack direction="row" gap="none" width={300} height={80}>
        <Box width="fill"><Content /></Box>
        <Box position="absolute" width={70} height={10} data-testid="layer" />
      </Stack>,
      "layer",
    );
    expect(layer.width).toBe(70);
  });
});
