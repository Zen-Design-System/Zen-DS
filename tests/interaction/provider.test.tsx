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
    await expect.element(screen.getByTestId("en").getByText("1 - 50 of 1234 results")).toBeVisible();
    await expect.element(screen.getByTestId("vi").getByText("1 - 50 trên 1234 kết quả")).toBeVisible();
  });
});
