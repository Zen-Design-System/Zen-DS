/** ZenProvider: token modes on the root element, locale → built-in labels, nested providers and label overrides. */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Pagination, ZenProvider, useZenLabels, useZenLocale } from "../../src/index";

function Probe({ id }: { id: string }) {
  const t = useZenLabels();
  return <span data-testid={id}>{`${t.close}|${t.nextPage}|${t.results(3)}|${useZenLocale()}`}</span>;
}

describe("ZenProvider", () => {
  it("writes the token modes as data attributes and sets lang", async () => {
    const screen = await render(<ZenProvider theme="dark" density="comfortable" typography="mobile" locale="vi" data-testid="root"><Probe id="probe" /></ZenProvider>);
    const root = screen.getByTestId("root");
    await expect.element(root).toHaveAttribute("data-theme", "dark");
    await expect.element(root).toHaveAttribute("data-density", "comfortable");
    await expect.element(root).toHaveAttribute("data-typography", "mobile");
    await expect.element(root).toHaveAttribute("lang", "vi");
  });

  it("contrast high re-resolves the colour tokens; a standard scope inside it puts the Zen values back", async () => {
    // The Checkbox border (Border/Neutral/Subtle, Neutral alpha 5) composited on white: 3:1 and up only in high contrast.
    const borderContrast = (element: Element) => {
      const hex = getComputedStyle(element).getPropertyValue("--zen-checkbox-border-default").trim().replace("#", "");
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      const channel = (c: number) => { const v = (c * a + 255 * (1 - a)) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      return 1.05 / (luminance + 0.05);
    };
    const screen = await render(
      <ZenProvider contrast="high" syncDocument={false} data-testid="high">
        <span data-testid="in-high" />
        <ZenProvider contrast="standard" data-testid="standard"><span data-testid="in-standard" /></ZenProvider>
      </ZenProvider>,
    );
    await expect.element(screen.getByTestId("high")).toHaveAttribute("data-contrast", "high");
    // A scope with no theme of its own still declares one, so the semantic colours re-resolve there.
    await expect.element(screen.getByTestId("high")).toHaveAttribute("data-theme", "light");
    await expect.element(screen.getByTestId("standard")).toHaveAttribute("data-contrast", "standard");
    expect(borderContrast(screen.getByTestId("in-high").element())).toBeGreaterThanOrEqual(3);
    expect(borderContrast(screen.getByTestId("in-standard").element())).toBeLessThan(3);
  });

  it("gives components English labels by default and Vietnamese under locale vi", async () => {
    const screen = await render(
      <>
        <Probe id="none" />
        <ZenProvider locale="vi-VN"><Probe id="vi" /></ZenProvider>
      </>,
    );
    await expect.element(screen.getByTestId("none")).toHaveTextContent("Close|Next page|3 results|en-US");
    await expect.element(screen.getByTestId("vi")).toHaveTextContent("Đóng|Trang sau|3 kết quả|vi-VN");
  });

  it("inherits the locale in nested providers and stacks label overrides", async () => {
    const screen = await render(
      <ZenProvider locale="vi" labels={{ close: "Tắt" }}>
        <ZenProvider theme="dark"><Probe id="nested" /></ZenProvider>
        <ZenProvider locale="en"><Probe id="english" /></ZenProvider>
      </ZenProvider>,
    );
    await expect.element(screen.getByTestId("nested")).toHaveTextContent("Tắt|Trang sau|3 kết quả|vi");
    await expect.element(screen.getByTestId("english")).toHaveTextContent("Tắt|Next page|3 results|en");
  });

  it("builds a component's whole sentence from one label (Pagination's range)", async () => {
    const screen = await render(
      <>
        <div data-testid="en"><Pagination theme="inline" page={1} pageSize={50} total={1234} /></div>
        <ZenProvider locale="vi"><div data-testid="vi"><Pagination theme="inline" page={1} pageSize={50} total={1234} /></div></ZenProvider>
      </>,
    );
    await expect.element(screen.getByTestId("en").getByText("1–50 of 1,234 results")).toBeVisible();
    await expect.element(screen.getByTestId("vi").getByText("1–50 trên 1.234 kết quả")).toBeVisible();
  });
});
