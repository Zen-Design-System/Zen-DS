/* Chat examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Chat decision: the desktop messenger pairs Conversation-List
   rows with a desktop thread, the phone holds a message to react, the inbox rows carry unread and call states, a reply
   quotes what it answers, a message that could not be sent stays with Retry, support chats use the Business domain, and
   attachments are cards with a read list under the last message.
   Each example is its own file in chat/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card renders
   its default export (a desktop app in the app frame, a phone app on the device) and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import TeamMessenger from "./chat/team-messenger.example";
import teamMessenger from "./chat/team-messenger.example.tsx?raw";
import HoldToReact from "./chat/hold-to-react.example";
import holdToReact from "./chat/hold-to-react.example.tsx?raw";
import ChatsInbox from "./chat/chats-inbox.example";
import chatsInbox from "./chat/chats-inbox.example.tsx?raw";
import ReplyToMessage from "./chat/reply-to-a-message.example";
import replyToMessage from "./chat/reply-to-a-message.example.tsx?raw";
import NotDelivered from "./chat/not-delivered.example";
import notDelivered from "./chat/not-delivered.example.tsx?raw";
import FirstMessage from "./chat/first-message.example";
import firstMessage from "./chat/first-message.example.tsx?raw";
import FilesPhotosCalls from "./chat/files-photos-and-calls.example";
import filesPhotosCalls from "./chat/files-photos-and-calls.example.tsx?raw";
import VoiceMessages from "./chat/voice-messages.example";
import voiceMessages from "./chat/voice-messages.example.tsx?raw";
import CustomerSupport from "./chat/customer-support.example";
import customerSupport from "./chat/customer-support.example.tsx?raw";

export const page: PlatformPage = "chat";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Team messenger",
    wide: true,
    screen: true,
    description: "The studio's messenger on desktop: an AppShell List-Detail, the Sidebar on its rail, the Conversation-List rows in the Leading-Pane and the open chat beside them. Its thread has device=\"desktop\": text runs to 516px and each message gets the hover toolbar; the composer docks at the bottom of the window. Opening a chat marks it read (the counts in the pane and the Sidebar follow), and Search narrows the list by name.",
    render: () => <PreviewAppFrame height={{ min: 600, max: 760 }}><TeamMessenger /></PreviewAppFrame>,
    code: exampleCode(teamMessenger),
  },
  {
    title: "Hold to react",
    description: "On a phone, holding a message (or Shift+F10 on a focused one) blurs the chat and shows the Reaction-Bar above it and its actions below; a call offers only Call back, Report and Delete. The reaction pill names who reacted, and Delete removes the message at once with Undo in the toast.",
    render: () => <PlatformPhoneApp label="Chat with Ava Chen" app={HoldToReact} />,
    code: exampleCode(holdToReact),
  },
  {
    title: "Chats inbox",
    description: "Unread chats have a bold preview and a green dot; a missed call stays red until opened, and a call going on now is green. The list is a tab root (the tab bar's Chats shows a dot while anything is unread); each row opens its chat, and Back returns to the list with that chat read.",
    render: () => <PlatformPhoneApp label="Chats" app={ChatsInbox} />,
    code: exampleCode(chatsInbox),
  },
  {
    title: "Reply to a message",
    wide: true,
    screen: true,
    description: "Reply in the hover toolbar fills the composer's “Replying to” bar, and × or Escape drops it. A sent reply quotes what it answers (text, a photo, a file, a call, or a deleted message) and pressing the quote jumps back to it. The chat app's Sidebar lists the groups and direct messages with their unread counts; picking one opens it.",
    render: () => <PreviewAppFrame height={{ min: 600, max: 760 }}><ReplyToMessage /></PreviewAppFrame>,
    code: exampleCode(replyToMessage),
  },
  {
    title: "Not delivered",
    description: "Without a network, a message stays in the thread with “Not delivered” and Retry instead of disappearing. Retry shows Sending… and then Sent, while the header reads Connecting… until the network is back.",
    render: () => <PlatformPhoneApp label="Chat with Duy Le" app={NotDelivered} />,
    code: exampleCode(notDelivered),
  },
  {
    title: "First message",
    description: "A new chat says who it is with instead of showing an empty thread, and offers one first step: Say hello sends a wave emoji. That first message opens the thread, and its Sent turns to Seen when Em answers.",
    render: () => <PlatformPhoneApp label="New chat with Em Pham" app={FirstMessage} />,
    code: exampleCode(firstMessage),
  },
  {
    title: "Files, photos and calls",
    wide: true,
    screen: true,
    description: "Attachments are cards: photos fill a 400px grid with “+N” past four, files take their type colour, and calls say what happened with one action. In a group, the read list under your last message replaces “Seen”. The group chat is part of its project: the trail leads back to it, and the header's Files and Photos tabs gather what the thread shared.",
    render: () => <PreviewAppFrame height={{ min: 600, max: 760 }}><FilesPhotosCalls /></PreviewAppFrame>,
    code: exampleCode(filesPhotosCalls),
  },
  {
    title: "Voice messages",
    description: "On a phone, ChatVoice plays a voice message in its bubble: the played share of the waveform turns full strength, a tap or drag on the waveform seeks (←/→, Home and End from the keyboard), the speed steps 1× → 1.5× → 2×, and hold (or Shift+F10 on a focused bubble) offers Reply, Forward, Pin and Delete as on a file.",
    render: () => <PlatformPhoneApp label="Voice messages with Bao Nguyen" canvas="canvas" app={VoiceMessages} />,
    code: exampleCode(voiceMessages),
  },
  {
    title: "Customer support",
    description: "A support chat in the Phin & Co app uses the Business domain on the Canvas background: the time sits inside every bubble and card, and support answers a moment after you write. Back leads to the app's Messages, a tab root.",
    render: () => <PlatformPhoneApp label="Phin & Co support chat" canvas="canvas" app={CustomerSupport} />,
    code: exampleCode(customerSupport),
  },
]);
