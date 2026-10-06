/**
 * Chat backlog fixes (2026-10-02): Reply moves focus into the composer, the demo's Delete offers Undo, message avatars
 * show two-letter initials, the thread stays pinned to its last message after the fonts settle, and file / call cards
 * hug their text in the mobile type scale.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { ChatCall, ChatComposer, ChatFile, ChatMessage, ChatThread, ZenProvider, chatHoldActions, type ChatReplyTarget } from "../../src/index";
import { ChatDemoNote, useChatDemo } from "../../src/platform/chatDemo";

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function ReplyChat({ device, initial }: { device: "mobile" | "desktop"; initial?: ChatReplyTarget }) {
  const [replyTo, setReplyTo] = useState<ChatReplyTarget | undefined>(initial);
  const reply = (id: string, text: string) => (action: string) => { if (action === "reply") setReplyTo({ id, author: "Ava Chen", kind: "text", text }); };
  return (
    <ZenProvider>
      <ChatThread device={device}>
        <ChatMessage id="m1" side="others" author={{ name: "Ava Chen" }} holdActions={chatHoldActions.others} onHoldAction={reply("m1", "Lunch?")} onReact={() => {}}>Lunch?</ChatMessage>
        <ChatMessage id="m2" side="others" author={{ name: "Ava Chen" }} holdActions={chatHoldActions.others} onHoldAction={reply("m2", "At noon")} onReact={() => {}}>At noon</ChatMessage>
      </ChatThread>
      <ChatComposer device={device} onSend={() => {}} replyTo={replyTo} onCancelReply={() => setReplyTo(undefined)} />
    </ZenProvider>
  );
}

describe("ChatComposer: Reply moves focus into the field", () => {
  it("desktop: the hover toolbar's Reply focuses the composer, and so does replying to another message", async () => {
    const screen = await render(<ReplyChat device="desktop" />);
    const field = screen.getByRole("textbox", { name: "Message" });
    await userEvent.hover(screen.getByText("Lunch?"));
    await screen.getByRole("button", { name: "Reply" }).first().click();
    await expect.element(screen.getByText("Replying to Ava Chen")).toBeInTheDocument();
    await vi.waitFor(() => expect(document.activeElement).toBe(field.element()));
    // Switching the reply to another message focuses the field again.
    await userEvent.hover(screen.getByText("At noon"));
    await screen.getByRole("button", { name: "Reply" }).nth(1).click();
    await vi.waitFor(() => expect(document.activeElement).toBe(field.element()));
  });

  it("mobile: Reply in the hold layer wins over the layer handing focus back to the bubble", async () => {
    const screen = await render(<ReplyChat device="mobile" />);
    const field = screen.getByRole("textbox", { name: "Message" });
    const bubble = screen.getByText("Lunch?").element().closest<HTMLElement>(".zen-chat-message__content")!;
    bubble.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog", { name: "Message actions" });
    await expect.element(dialog).toBeInTheDocument();
    await dialog.getByRole("option", { name: "Reply" }).click();
    await vi.waitFor(() => expect(document.activeElement).toBe(field.element()));
    await frame();
    expect(document.activeElement).toBe(field.element());
  });

  it("does not take focus when it mounts with a reply already set", async () => {
    const screen = await render(<ReplyChat device="mobile" initial={{ id: "m1", author: "Ava Chen", kind: "text", text: "Lunch?" }} />);
    await expect.element(screen.getByText("Replying to Ava Chen")).toBeInTheDocument();
    await frame();
    expect(document.activeElement).not.toBe(screen.getByRole("textbox", { name: "Message" }).element());
  });
});

function DemoChat() {
  const demo = useChatDemo();
  const messages = [{ id: "a", text: "First message" }, { id: "b", text: "Second message" }, { id: "c", text: "Third message" }];
  return (
    <>
      <ChatThread device="desktop">
        {messages.filter((m) => !demo.isDeleted(m.id)).map((m) => (
          <ChatMessage key={m.id} {...demo.act(m.id, "others", { text: m.text, author: "Ava Chen" })} side="others" author={{ name: "Ava Chen" }}>{m.text}</ChatMessage>
        ))}
      </ChatThread>
      <ChatComposer device="desktop" onSend={() => {}} {...demo.composerReply} />
      <ChatDemoNote note={demo.note} />
    </>
  );
}

/** Opens the desktop More list of a message from its bubble (Enter) and picks Delete. */
async function deleteMessage(text: string) {
  const bubble = document.evaluate(`//p[text()="${text}"]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue as HTMLElement;
  bubble.closest<HTMLElement>(".zen-chat-message__content")!.focus();
  await userEvent.keyboard("{Enter}");
  const option = await vi.waitFor(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>(".zen-popover [role='option']")).find((node) => node.textContent?.includes("Delete"));
    if (!found) throw new Error("no Delete option");
    return found;
  });
  await userEvent.click(option);
}

describe("useChatDemo: Delete acts at once and offers Undo", () => {
  it("removes the message, focuses the next one, and Undo in the toast puts it back", async () => {
    const screen = await render(<ZenProvider><DemoChat /></ZenProvider>);
    await deleteMessage("Second message");
    await expect.element(screen.getByText("Second message")).not.toBeInTheDocument();
    const third = screen.getByText("Third message").element().closest(".zen-chat-message__content");
    await vi.waitFor(() => expect(document.activeElement).toBe(third));
    const undo = screen.getByRole("button", { name: "Undo" });
    await expect.element(undo).toBeInTheDocument();
    await undo.click();
    await expect.element(screen.getByText("Second message")).toBeInTheDocument();
    // The toast closes, and focus lands on the restored message instead of dropping to <body>.
    await expect.element(screen.getByRole("button", { name: "Undo" })).not.toBeInTheDocument();
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText("Second message").element().closest(".zen-chat-message__content")));
  });

  it("the last message hands focus to the composer", async () => {
    const screen = await render(<ZenProvider><div className="pe-chat-demo"><DemoChat /></div></ZenProvider>);
    await deleteMessage("Third message");
    await expect.element(screen.getByText("Third message")).not.toBeInTheDocument();
    // The previous message is the neighbour that is left.
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText("Second message").element().closest(".zen-chat-message__content")));
  });

  it("without a toast host (a playground panel) it still deletes and announces it", async () => {
    const screen = await render(<DemoChat />);
    await deleteMessage("First message");
    await expect.element(screen.getByText("First message")).not.toBeInTheDocument();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Message deleted");
  });
});

describe("ChatMessage avatar without a photo", () => {
  for (const typography of ["dashboard", "mobile"] as const) {
    // The widest pairs (M / W only, e.g. "MW") measure ~24.6px in the mobile scale's 13px Caption at Compact: reported.
    it(`shows two-letter initials (first + last name) that fit the XSmall circle (${typography} type)`, async () => {
      await render(
        <ZenProvider typography={typography}>
          <ChatThread>
            <ChatMessage side="others" author={{ name: "Nguyen Van Bao" }}>Hi</ChatMessage>
            <ChatMessage side="you">Hello</ChatMessage>
            <ChatMessage side="others" author={{ name: "Ha Kim Dung", theme: "blue" }}>Hey</ChatMessage>
            <ChatMessage side="you">Hello</ChatMessage>
            <ChatMessage side="others" author={{ name: "Linh" }}>Yo</ChatMessage>
          </ChatThread>
        </ZenProvider>,
      );
      const initials = Array.from(document.querySelectorAll<HTMLElement>(".zen-chat-message__avatar .zen-avatar__initials"));
      expect(initials.map((node) => node.textContent)).toEqual(["NB", "HD", "L"]);
      for (const node of initials) {
        const circle = node.closest<HTMLElement>(".zen-avatar")!.getBoundingClientRect();
        const text = node.getBoundingClientRect();
        expect(node.scrollWidth).toBeLessThanOrEqual(Math.ceil(text.width));
        expect(text.width).toBeLessThan(circle.width);
      }
    });
  }
});

describe("ChatThread stays pinned to the latest message", () => {
  function Tall() {
    return (
      <ZenProvider>
        <div style={{ display: "flex", height: 240, flexDirection: "column" }}>
          <ChatThread>
            {Array.from({ length: 16 }, (_, index) => <ChatMessage key={index} side={index % 2 ? "you" : "others"} author={{ name: "Ava Chen" }}>{`Message ${index + 1}`}</ChatMessage>)}
          </ChatThread>
        </div>
      </ZenProvider>
    );
  }
  const reflow = (css: string) => { const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style); return () => style.remove(); };

  it("pins again when the text reflows after mount (web fonts settling) and when the thread scrolls with no input", async () => {
    await render(<Tall />);
    const thread = document.querySelector<HTMLElement>(".zen-chat-thread")!;
    const fromEnd = () => thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    await vi.waitFor(() => expect(fromEnd()).toBeLessThan(2));
    // A wider face arrives: every bubble grows, the scroll position does not move by itself.
    const undo = reflow(".zen-chat-bubble__text { font-size: 22px !important; line-height: 34px !important; }");
    await vi.waitFor(() => expect(fromEnd()).toBeLessThan(2));
    // Scroll anchoring (or any scroll without the reader's input) does not unpin it either.
    thread.scrollTop -= 150;
    await frame();
    const undoMore = reflow(".zen-chat-bubble__text { padding-block: 6px; }");
    await vi.waitFor(() => expect(fromEnd()).toBeLessThan(2));
    undoMore();
    undo();
  });

  it("keeps the reader's position once they scroll up", async () => {
    await render(<Tall />);
    const thread = document.querySelector<HTMLElement>(".zen-chat-thread")!;
    await vi.waitFor(() => expect(thread.scrollHeight - thread.scrollTop - thread.clientHeight).toBeLessThan(2));
    thread.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: -200 }));
    thread.scrollTop = 0;
    await frame();
    const undo = reflow(".zen-chat-bubble__text { font-size: 22px !important; line-height: 34px !important; }");
    await frame();
    await frame();
    expect(thread.scrollTop).toBe(0);
    undo();
  });
});

describe("File and call cards in the mobile type scale", () => {
  const edges = (card: HTMLElement) => {
    const lines = Array.from(card.querySelectorAll<HTMLElement>(".zen-chat-file__text > *"));
    const box = card.getBoundingClientRect();
    return { box, first: lines[0].getBoundingClientRect(), last: lines[lines.length - 1].getBoundingClientRect(), text: card.querySelector<HTMLElement>(".zen-chat-file__text")! };
  };

  it("hug their text: no spill out of the 32px Message-Text box, the lines keep the card's 12px inset", async () => {
    await render(
      <ZenProvider typography="mobile">
        <ChatThread>
          <ChatMessage side="others"><ChatFile kind="pdf" name="Q4 brief.pdf" size="2.4 MB" onOpen={() => {}} /></ChatMessage>
          <ChatMessage side="you"><ChatCall side="you" state="out-missed" detail="No answer" onAction={() => {}} /></ChatMessage>
        </ChatThread>
      </ZenProvider>,
    );
    const file = edges(document.querySelector<HTMLElement>(".zen-chat-file")!);
    expect(file.text.offsetHeight).toBeGreaterThan(32);
    expect(file.first.top - file.box.top).toBeCloseTo(12, 0);
    expect(file.box.bottom - file.last.bottom).toBeCloseTo(12, 0);
    const callCard = document.querySelector<HTMLElement>(".zen-chat-call")!;
    expect(callCard.dataset.action).toBe("true");
    const call = edges(callCard);
    const action = callCard.querySelector<HTMLElement>(".zen-chat-call__action")!.getBoundingClientRect();
    // Padding/XSmall 8 + the row's Padding/2XSmall 4 above; the row's 4 + Gap/XSmall 8 above the action.
    expect(call.first.top - call.box.top).toBeCloseTo(12, 0);
    expect(action.top - call.last.bottom).toBeCloseTo(12, 0);
  });

  it("keep Figma's fixed 32px box in its own 20/16 scale", async () => {
    await render(
      <ZenProvider typography="dashboard">
        <ChatMessage side="others"><ChatFile kind="pdf" name="Q4 brief.pdf" size="2.4 MB" onOpen={() => {}} /></ChatMessage>
      </ZenProvider>,
    );
    expect(document.querySelector<HTMLElement>(".zen-chat-file__text")!.offsetHeight).toBe(32);
  });
});
