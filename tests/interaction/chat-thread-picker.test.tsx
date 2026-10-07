/**
 * Chat fixes found by the smoke investigation (2026-10-02): a reader's input on an older part of the thread unpins it, so a
 * re-render no longer snaps the thread (and an open message menu) to the bottom; the hover Reaction-Bar focuses an emoji
 * once when it opens, not again on every render.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { ChatMessage, ChatThread, ZenProvider } from "../../src/index";

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function Tall({ count }: { count: number }) {
  return (
    <ZenProvider>
      <div style={{ display: "flex", height: 240, flexDirection: "column" }}>
        <ChatThread>
          {Array.from({ length: count }, (_, index) => <ChatMessage key={index} side={index % 2 ? "you" : "others"} author={{ name: "Ava Chen" }}>{`Message ${index + 1}`}</ChatMessage>)}
        </ChatThread>
      </div>
    </ZenProvider>
  );
}

describe("ChatThread: the reader's input away from the end unpins it", () => {
  for (const [name, input] of [
    ["a pointer press", (target: Element) => target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))],
    ["focus moving in (Tab)", (target: Element) => target.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))],
  ] as const) {
    it(`${name} on an older message keeps that position when a new message arrives`, async () => {
      const screen = await render(<Tall count={16} />);
      const thread = document.querySelector<HTMLElement>(".zen-chat-thread")!;
      await vi.waitFor(() => expect(thread.scrollHeight - thread.scrollTop - thread.clientHeight).toBeLessThan(2));
      // Let the thread's own late pins (document.fonts.ready) run first.
      await document.fonts.ready;
      await frame();
      // Moved by script (scrollIntoView, find-in-page): its scroll event comes with no input, so the thread stays pinned...
      thread.scrollTop = 0;
      await frame();
      // ...until the reader acts there.
      input(thread.querySelector(".zen-chat-message")!);
      await screen.rerender(<Tall count={17} />);
      await frame();
      expect(thread.scrollTop).toBe(0);
    });
  }

  it("the reader's own new message brings the thread back to its end; someone else's does not", async () => {
    const screen = await render(<Tall count={16} />);
    const thread = document.querySelector<HTMLElement>(".zen-chat-thread")!;
    await vi.waitFor(() => expect(thread.scrollHeight - thread.scrollTop - thread.clientHeight).toBeLessThan(2));
    await document.fonts.ready;
    await frame();
    thread.scrollTop = 0;
    await frame();
    thread.querySelector(".zen-chat-message")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    // Message 17 is from the other side: the reader keeps their place.
    await screen.rerender(<Tall count={17} />);
    await frame();
    expect(thread.scrollTop).toBe(0);
    // Message 18 is the reader's own (side "you"): the thread shows it.
    await screen.rerender(<Tall count={18} />);
    await vi.waitFor(() => expect(thread.scrollHeight - thread.scrollTop - thread.clientHeight).toBeLessThan(2));
  });

  // Index keys on purpose: React reuses the nodes, so only the message content tells an append from other changes.
  function History({ items }: { items: { text: string; side: "you" | "others" }[] }) {
    return (
      <ZenProvider>
        <div style={{ display: "flex", height: 240, flexDirection: "column" }}>
          <ChatThread>
            {items.map((item, index) => <ChatMessage key={index} side={item.side} author={{ name: "Ava Chen" }}>{item.text}</ChatMessage>)}
          </ChatThread>
        </div>
      </ZenProvider>
    );
  }
  const items = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ text: `Message ${from + i}`, side: ((from + i) % 2 ? "you" : "others") as "you" | "others" }));
  const scrolledAway = async () => {
    const thread = document.querySelector<HTMLElement>(".zen-chat-thread")!;
    await vi.waitFor(() => expect(thread.scrollHeight - thread.scrollTop - thread.clientHeight).toBeLessThan(2));
    await document.fonts.ready;
    await frame();
    thread.scrollTop = 0;
    await frame();
    thread.querySelector(".zen-chat-message")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    return thread;
  };

  it("older history loading above, a removed last message or an Undo that puts it back keep the reader's place", async () => {
    // Messages 1–17: the last one (17) is the reader's own.
    const screen = await render(<History items={items(1, 17)} />);
    const thread = await scrolledAway();
    // Older history loads above (with index keys the last node is new but holds message 17 again).
    await screen.rerender(<History items={items(0, 17)} />);
    await frame();
    expect(thread.scrollTop).toBe(0);
    // The last two messages go (17 and 16): the reader's own 15 is last now.
    await screen.rerender(<History items={items(0, 15)} />);
    await frame();
    expect(thread.scrollTop).toBe(0);
    // Undo puts 16 and 17 back: an append in shape, but nothing new was sent.
    await screen.rerender(<History items={items(0, 16)} />);
    await screen.rerender(<History items={items(0, 17)} />);
    await frame();
    expect(thread.scrollTop).toBe(0);
  });

  it("an input the moment the messages grow does not unpin it (the end is re-pinned)", async () => {
    await render(<Tall count={16} />);
    const thread = document.querySelector<HTMLElement>(".zen-chat-thread")!;
    await vi.waitFor(() => expect(thread.scrollHeight - thread.scrollTop - thread.clientHeight).toBeLessThan(2));
    await document.fonts.ready;
    await frame();
    // A photo decoding or a reaction row appearing grows the thread; a press lands before the re-pin.
    const style = document.createElement("style");
    style.textContent = ".zen-chat-bubble__text { padding-block: 24px; }";
    document.head.appendChild(style);
    thread.querySelector(".zen-chat-message")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await vi.waitFor(() => expect(thread.scrollHeight - thread.scrollTop - thread.clientHeight).toBeLessThan(2));
    style.remove();
  });

  it("with no input, a new message still brings the thread to its end", async () => {
    const screen = await render(<Tall count={16} />);
    const thread = document.querySelector<HTMLElement>(".zen-chat-thread")!;
    await vi.waitFor(() => expect(thread.scrollHeight - thread.scrollTop - thread.clientHeight).toBeLessThan(2));
    await document.fonts.ready;
    await frame();
    thread.scrollTop = 0;
    await frame();
    await screen.rerender(<Tall count={17} />);
    await vi.waitFor(() => expect(thread.scrollHeight - thread.scrollTop - thread.clientHeight).toBeLessThan(2));
  });
});

describe("ChatMessage hover Reaction-Bar", () => {
  function Reacting({ note }: { note: string }) {
    return (
      <ZenProvider>
        <ChatThread device="desktop">
          <ChatMessage side="others" author={{ name: "Ava Chen" }} onReact={() => {}}>Lunch?</ChatMessage>
        </ChatThread>
        <p>{note}</p>
      </ZenProvider>
    );
  }

  it("focuses an emoji once on opening; a re-render keeps the emoji the reader moved to", async () => {
    const screen = await render(<Reacting note="a" />);
    await userEvent.hover(screen.getByText("Lunch?"));
    await screen.getByRole("button", { name: "React" }).click();
    const emojis = () => [...document.querySelectorAll<HTMLElement>(".zen-chat-message__hover-popover .zen-chat-picker__emoji")];
    await vi.waitFor(() => expect(document.activeElement).toBe(emojis()[0]));
    await userEvent.tab();
    expect(document.activeElement).toBe(emojis()[1]);
    await screen.rerender(<Reacting note="b" />);
    await frame();
    expect(document.activeElement).toBe(emojis()[1]);
  });
});
