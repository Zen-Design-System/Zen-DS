/* AI Chat examples (docs/research/example-rebuild-brief-2026-09-30.md). Zen AI is the assistant inside Đìzai Studio's
   workspace: Alex asks it about his week, projects, files and invoices, and every answer comes from the shared studio
   data. Answers think for a moment and then stream a word at a time, so Stop, feedback and retry can be tried. Each
   example is its own file in ai-chat/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card renders
   its default export (the studio app in a desktop window, the phone app on the device) and shows its text as the
   snippet. */
import { useRef, type ComponentType } from "react";
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp, type PhoneScrollRef } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import DictateAPrompt from "./ai-chat/dictate-a-prompt.example";
import dictateAPrompt from "./ai-chat/dictate-a-prompt.example.tsx?raw";
import AssistantHome from "./ai-chat/assistant-home.example";
import assistantHome from "./ai-chat/assistant-home.example.tsx?raw";
import RateAnAnswer from "./ai-chat/rate-an-answer.example";
import rateAnAnswer from "./ai-chat/rate-an-answer.example.tsx?raw";
import AnswerFailed from "./ai-chat/answer-failed.example";
import answerFailed from "./ai-chat/answer-failed.example.tsx?raw";
import EditAPrompt from "./ai-chat/edit-a-prompt.example";
import editAPrompt from "./ai-chat/edit-a-prompt.example.tsx?raw";
import AssistantOnAPhone from "./ai-chat/assistant-on-a-phone.example";
import assistantOnAPhone from "./ai-chat/assistant-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "ai-chat";

/** The studio app in a desktop window. The window's scroller is what the app scrolls to keep the newest answer in view,
 *  so the example gets it as `scrollRef` ("window" in an app). Docs chrome, not part of the example. */
function AppWindow({ app: App }: { app: ComponentType<{ scrollRef?: PhoneScrollRef }> }) {
  const scrollRef = useRef<HTMLElement | null>(null);
  return (
    <PreviewAppFrame height={{ min: 600, max: 760 }} frameRef={(frame) => { scrollRef.current = frame?.querySelector<HTMLElement>(".pf-app-frame__scroll") ?? null; }}>
      <App scrollRef={scrollRef} />
    </PreviewAppFrame>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Dictate a prompt",
    description: "The field's Voice state: the microphone starts dictation, the prompt reads Listening… and the microphone turns into Stop. Stop puts the words in the field to edit before sending. The Primary Voice action opens voice mode (AI Voice Conversation) until End.",
    render: () => <DictateAPrompt />,
    code: exampleCode(dictateAPrompt),
  },
  {
    title: "Assistant home",
    screen: true,
    description: "A full-page assistant in the studio app opens on the Block in the middle of the page: a greeting, the field and suggestions that start real tasks. The first prompt turns it into a Thread with the field docked at the bottom of the window; the answer streams with Stop in the field and shows its actions once it ends. New chat in the page header goes back to the greeting.",
    render: () => <AppWindow app={AssistantHome} />,
    code: exampleCode(assistantHome),
  },
  {
    title: "Rate an answer",
    description: "Good and Bad response are toggle buttons that swap to the solid thumb. Bad response asks what went wrong with a row of Chips; Regenerate streams a new version and counts it (2/2).",
    render: () => <RateAnAnswer />,
    code: exampleCode(rateAnAnswer),
  },
  {
    title: "Answer failed",
    description: "When an answer fails, the question stays and a Negative Inline Message takes the answer's place. Try again shows the thinking dots, named Retrying, and the answer streams like any other.",
    render: () => <AnswerFailed />,
    code: exampleCode(answerFailed),
  },
  {
    title: "Edit a prompt",
    description: "Edit puts a prompt back in the field with the caret at the end; a prompt this long moves above the controls. Shift+Enter adds a line, and Enter sends it in place of the old prompt and its answer.",
    render: () => <EditAPrompt />,
    code: exampleCode(editAPrompt),
  },
  {
    title: "Assistant on a phone",
    description: "On a phone the Block fills the first screen and leaves out the model switch. Once Alex asks, the field docks at the bottom of the shell above the home indicator, and New chat in the Top Navigation goes back to the greeting.",
    render: () => <PlatformPhoneApp label="Zen AI" app={AssistantOnAPhone} />,
    code: exampleCode(assistantOnAPhone),
  },
]);
