/**
 * Approved component fixes (2026-10-01): Bottom Navigation idle label contrast, InlineMessage action hit area, Pagination
 * arrow size and range copy, Badge remove name, Chat sentence-case labels, the no-action call card's bottom padding and
 * the composer's focus indicator.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import {
  Badge, BottomNavigation, ChatCall, ChatComposer, ChatConversationItem, ChatMessage, ChatThread, InlineMessage, Pagination, ZenProvider,
} from "../../src/index";

/** sRGB channels (0–255) and alpha of a computed `rgb()` / `rgba()` / `color(srgb …)` value. */
function parseColor(value: string): [number, number, number, number] {
  const srgb = value.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])];
  const parts = value.match(/[\d.]+/g)!.map(Number);
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}
const luminance = ([r, g, b]: number[]) => {
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
/** WCAG contrast of `fg` (alpha-composited) over the opaque `bg`. */
function contrast(fg: string, bg: string) {
  const [fr, fgG, fb, fa] = parseColor(fg);
  const [br, bgG, bb] = parseColor(bg);
  const mixed = [fr * fa + br * (1 - fa), fgG * fa + bgG * (1 - fa), fb * fa + bb * (1 - fa)];
  const [l1, l2] = [luminance(mixed), luminance([br, bgG, bb])].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

const navItems = [
  { id: "home", label: "Home", icon: "icon-home-02-line" as const },
  { id: "alerts", label: "Alerts", icon: "icon-bell-01-line" as const },
  { id: "me", label: "Profile", icon: "icon-user-line" as const },
];

describe("BottomNavigation idle labels", () => {
  for (const theme of ["light", "dark"] as const) {
    // User decision (2026-10-02): idle labels are Content/Neutral/Light, not a darker colour for 4.5:1.
    it(`idle labels are Content/Neutral/Light on the Default bar (${theme}); idle icons keep Figma's Placeholder`, async () => {
      await render(
        <ZenProvider theme={theme}>
          <BottomNavigation items={navItems} value="home" onValueChange={() => {}} showLabels />
        </ZenProvider>,
      );
      const nav = document.querySelector<HTMLElement>(".zen-bottom-nav")!;
      const background = getComputedStyle(nav).backgroundColor;
      const idle = document.querySelector<HTMLElement>(".zen-bottom-nav__item[data-selected='false']")!;
      const label = idle.querySelector<HTMLElement>(".zen-bottom-nav__label")!;
      const probe = document.createElement("span");
      probe.style.color = "var(--zen-color-content-neutral-light)";
      nav.append(probe);
      expect(getComputedStyle(label).color).toBe(getComputedStyle(probe).color);
      probe.remove();
      expect(background).not.toBe("");
      // The icon stays Content/Placeholder (Figma 4060:26507, Select=No): it is the item's colour, not the label's.
      const placeholder = getComputedStyle(nav).getPropertyValue("--zen-color-content-placeholder").trim();
      expect(placeholder).not.toBe("");
      // Polled: under a loaded full run the item's 120ms colour transition can still be on its first frame here.
      await expect.poll(() => getComputedStyle(idle).color !== getComputedStyle(label).color).toBe(true);
      const selectedLabel = document.querySelector<HTMLElement>(".zen-bottom-nav__item[data-selected='true'] .zen-bottom-nav__label")!;
      expect(getComputedStyle(selectedLabel).color).toBe(getComputedStyle(selectedLabel.parentElement!).color);
    });
  }
});

describe("InlineMessage action", () => {
  it("is at least 24px tall (Button/Main Small; the docs phone only scales it down)", async () => {
    const screen = await render(
      <ZenProvider><InlineMessage title="Sync paused" action={{ label: "Resume", onClick: () => {} }}>Changes are saved on this device.</InlineMessage></ZenProvider>,
    );
    const action = screen.getByRole("button", { name: "Resume" }).element() as HTMLElement;
    expect(action.offsetHeight).toBeGreaterThanOrEqual(24);
    expect(action.offsetWidth).toBeGreaterThanOrEqual(24);
  });
});

describe("Pagination", () => {
  it("sizes the ‹ › arrows like the page items", async () => {
    const screen = await render(
      <ZenProvider>
        <div data-testid="xs"><Pagination page={2} pageCount={5} onPageChange={() => {}} /></div>
        <div data-testid="sm"><Pagination page={2} pageCount={5} size="sm" onPageChange={() => {}} /></div>
        <div data-testid="small"><Pagination page={2} pageCount={5} size="small" onPageChange={() => {}} /></div>
      </ZenProvider>,
    );
    for (const [id, height] of [["xs", 24], ["sm", 32], ["small", 32]] as const) {
      const root = screen.getByTestId(id);
      const previous = root.getByRole("button", { name: "Previous page" }).element() as HTMLElement;
      const next = root.getByRole("button", { name: "Next page" }).element() as HTMLElement;
      const item = root.getByRole("button", { name: "Page 1" }).element() as HTMLElement;
      expect(item.offsetHeight).toBe(height);
      expect(previous.offsetHeight).toBe(height);
      expect(next.offsetHeight).toBe(height);
    }
  });

  it("writes the range with an en dash and thousands separators (en and vi)", async () => {
    const screen = await render(
      <>
        <div data-testid="en"><Pagination theme="inline" page={1} pageSize={10} total={1284} /></div>
        <div data-testid="en-last"><Pagination theme="manually" page={129} pageSize={10} total={1284} /></div>
        <ZenProvider locale="vi"><div data-testid="vi"><Pagination theme="inline" page={1} pageSize={10} total={1284} /></div></ZenProvider>
      </>,
    );
    await expect.element(screen.getByTestId("en").getByText("1–10 of 1,284 results")).toBeVisible();
    await expect.element(screen.getByTestId("en-last").getByText("1,281–1,284 of 1,284 results")).toBeVisible();
    await expect.element(screen.getByTestId("vi").getByText("1–10 trên 1.284 kết quả")).toBeVisible();
  });
});

describe("Badge remove", () => {
  it("names the remove button after the badge (Remove <label>), like Tag", async () => {
    const onRemove = vi.fn();
    const screen = await render(
      <>
        <ZenProvider><Badge remove onRemove={onRemove}>Design</Badge></ZenProvider>
        <ZenProvider locale="vi"><Badge remove onRemove={() => {}}>Thiết kế</Badge></ZenProvider>
        <ZenProvider><Badge remove onRemove={() => {}}><strong>Urgent</strong></Badge></ZenProvider>
      </>,
    );
    await screen.getByRole("button", { name: "Remove Design" }).click();
    expect(onRemove).toHaveBeenCalledTimes(1);
    await expect.element(screen.getByRole("button", { name: "Xoá Thiết kế" })).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "Remove", exact: true })).toBeInTheDocument();
  });
});

describe("Chat built-in labels", () => {
  it("reads in sentence case (en)", async () => {
    const screen = await render(
      <ZenProvider>
        <ChatThread>
          <ChatMessage side="others"><ChatCall state="in-missed" detail="8:50 am" onAction={() => {}} /></ChatMessage>
          <ChatMessage side="you"><ChatCall side="you" state="out-missed" detail="No answer" onAction={() => {}} /></ChatMessage>
          <ChatMessage side="you" domain="business"><ChatCall side="you" state="out-missed" detail="No answer" onAction={() => {}} /></ChatMessage>
        </ChatThread>
        <ul>
          <ChatConversationItem person={{ name: "Ava Chen" }} time="9:41" call="missed-audio" />
          <ChatConversationItem person={{ name: "Bao Nguyen" }} time="9:40" call="incoming" />
          <ChatConversationItem person={{ name: "Chi Tran" }} time="9:39" call="ongoing" />
        </ul>
      </ZenProvider>,
    );
    await expect.element(screen.getByRole("button", { name: "Call back", exact: true })).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "Call again", exact: true })).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "Send voice message", exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("Missed call", { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("Audio call", { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("Ongoing call…", { exact: true })).toBeInTheDocument();
  });
});

describe("ChatCall without an action", () => {
  for (const typography of ["dashboard", "mobile"] as const) {
    it(`keeps a text bubble's bottom padding below its last line (${typography} type)`, async () => {
      await render(
        <ZenProvider typography={typography}>
          <ChatThread>
            <ChatMessage side="you" domain="business" time="10:06 am">Got them, thank you!</ChatMessage>
            <ChatMessage side="you" domain="business"><ChatCall side="you" state="out-call" detail="Calling…" /></ChatMessage>
            <ChatMessage side="others" domain="business" time="10:31 am"><ChatCall state="in-call" detail="12 min" /></ChatMessage>
          </ChatThread>
        </ZenProvider>,
      );
      const bubble = document.querySelector<HTMLElement>(".zen-chat-bubble")!;
      const bubbleLast = bubble.lastElementChild!.getBoundingClientRect();
      const bubbleGap = bubble.getBoundingClientRect().bottom - bubbleLast.bottom;
      expect(bubbleGap).toBeCloseTo(12, 0);
      for (const card of document.querySelectorAll<HTMLElement>(".zen-chat-call")) {
        expect(card.dataset.action).toBeUndefined();
        const lines = [...card.querySelectorAll<HTMLElement>(".zen-chat-file__text > *")];
        const lastLine = lines[lines.length - 1].getBoundingClientRect();
        const firstLine = lines[0].getBoundingClientRect();
        expect(card.getBoundingClientRect().bottom - lastLine.bottom).toBeCloseTo(bubbleGap, 0);
        expect(firstLine.top - card.getBoundingClientRect().top).toBeCloseTo(bubbleGap, 0);
      }
    });
  }

  it("keeps Figma's 40px row when the card has an action", async () => {
    await render(
      <ZenProvider typography="dashboard">
        <ChatMessage side="others"><ChatCall state="in-missed" detail="8:50 am" onAction={() => {}} /></ChatMessage>
      </ZenProvider>,
    );
    const card = document.querySelector<HTMLElement>(".zen-chat-call")!;
    expect(card.dataset.action).toBe("true");
    expect(card.querySelector<HTMLElement>(".zen-chat-call__row")!.offsetHeight).toBe(40);
  });
});

describe("ChatComposer focus", () => {
  it("shows a visible focus ring on the field while the textarea is focused", async () => {
    const screen = await render(<ZenProvider><ChatComposer onSend={() => {}} /></ZenProvider>);
    const field = document.querySelector<HTMLElement>(".zen-chat-composer__field")!;
    const resting = getComputedStyle(field).boxShadow;
    const textarea = screen.getByRole("textbox", { name: "Message" });
    await textarea.click();
    expect(document.activeElement).toBe(textarea.element());
    const focused = getComputedStyle(field).boxShadow;
    expect(focused).not.toBe(resting);
    // The 3px outside ring (spread 3px, no blur) and the 1px inside stroke of the standard Input focus.
    expect(focused).toMatch(/0px 0px 0px 3px/);
    expect(focused).toMatch(/inset 0px 0px 0px 1px|0px 0px 0px 1px inset/);
  });
});
