// Harness case kinds for the chat suites (tools/figma-contract/suites). cases.tsx merges every group's kinds.
import type { ReactNode } from "react";
import { ChatMessage, ChatReactions, ChatThread, chatHoldActionsFor } from "../../../src/components/Chat";

type Props = Record<string, any>;
const noop = () => {};

export const cases: Record<string, (props: Props) => ReactNode> = {
  // A text message as apps place it (Figma Chat/Bubble/Text-* is the bubble of Chat/Conversation/Bubble): one ChatMessage in
  // a ChatThread of the variant's Device, wide enough that the desktop thread keeps its Hover gutter (above 480px).
  // `reaction` turns on Figma's Reaction property (the pill), `hover` its Hover property (desktop toolbar: React · Reply · More).
  chatTextBubble: ({ device, side, domain, text, time, reaction, hover }) => (
    <div style={{ width: device === "desktop" ? 800 : 390 }}>
      <ChatThread device={device}>
        <ChatMessage side={side} domain={domain} time={time} author={side === "others" ? { name: "Bao Tran" } : undefined}
          reactions={reaction ? [{ kind: reaction }] : undefined}
          holdActions={hover ? chatHoldActionsFor("text", side) : undefined} onReact={hover ? noop : undefined}>
          {text}
        </ChatMessage>
      </ChatThread>
    </div>
  ),
  // Figma Chat/Reaction/Status: the pill alone (read-only: no `by` / `mine`, so a <span role="img">). It is absolutely placed
  // on a bubble's bottom-right corner, so a sized box stands in for the bubble (the case must have a size to render).
  chatReactionStatus: ({ reactions }) => (
    <div style={{ position: "relative", width: 96, height: 40 }}>
      <ChatReactions reactions={reactions} />
    </div>
  ),
};
