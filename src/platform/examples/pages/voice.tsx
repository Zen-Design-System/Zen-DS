/* Voice examples (Figma ❖ Voice 15081:1294): Đìzai Studio's work — a voice note on a task (Discard can be undone), a
   microphone the browser blocked, your own microphone's levels (with a silence warning), talking a day through with
   Zen AI (your turn ends on silence, then Zen thinks and answers), a turn it did not catch, and the conversation on a
   phone. Every action works.
   Each example is its own file in voice/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. The timers that move the demos (the take's clock, the
   conversation's words) are setTimeout chains started by the press that sets them going. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import TaskVoiceNote from "./voice/record-a-voice-note-on-a-task.example";
import taskVoiceNote from "./voice/record-a-voice-note-on-a-task.example.tsx?raw";
import MicrophoneBlocked from "./voice/microphone-blocked.example";
import microphoneBlocked from "./voice/microphone-blocked.example.tsx?raw";
import LiveMicrophone from "./voice/your-microphones-real-levels.example";
import liveMicrophone from "./voice/your-microphones-real-levels.example.tsx?raw";
import TalkWithZen from "./voice/talk-a-day-through-with-zen-ai.example";
import talkWithZen from "./voice/talk-a-day-through-with-zen-ai.example.tsx?raw";
import NotCaught from "./voice/a-turn-zen-did-not-catch.example";
import notCaught from "./voice/a-turn-zen-did-not-catch.example.tsx?raw";
import PhoneVoice from "./voice/voice-mode-on-a-phone.example";
import phoneVoice from "./voice/voice-mode-on-a-phone.example.tsx?raw";
import TakeLimit from "./voice/the-one-minute-limit-on-a-narrow-card.example";
import takeLimit from "./voice/the-one-minute-limit-on-a-narrow-card.example.tsx?raw";

export const page: PlatformPage = "voice";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Record a voice note on a task",
    description: "Voice Recorder on a Card: Record starts the take, Pause and Resume hold it, Finish attaches it to the task's list and Discard throws it away with an Undo in a toast, so a take is never lost to one press. Discard and Finish stay off until there is a take.",
    render: () => <TaskVoiceNote />,
    code: exampleCode(taskVoiceNote),
  },
  {
    title: "Microphone blocked",
    description: "Record cannot start until the browser allows the microphone: an Inline Message says why and offers the fix, and the footer names the missing input. Allow microphone starts the take.",
    render: () => <MicrophoneBlocked />,
    code: exampleCode(microphoneBlocked),
  },
  {
    title: "Your microphone's real levels",
    description: "useVoiceLevels(stream) turns your microphone into the recorder's levels: one every 1/7 s, the waveform's speed, so a real take scrolls like the sample. Paused, the take holds still. When nothing is heard for 3 seconds the guidance says so and what to check. Record asks for the microphone.",
    render: () => <LiveMicrophone />,
    code: exampleCode(liveMicrophone),
  },
  {
    title: "Talk a day through with Zen AI",
    description: "AI Voice Conversation: Start talking listens (the transcript fills in as you speak) and your turn ends on a moment of silence — Done speaking is the manual way. Zen thinks (the signal rests as dots that brighten in turn), then its words appear as it says them and it listens again. Interrupt takes the turn back and End closes the conversation. Mute is a toggle that stays off until you start; muted, the signal rests and the transcript stops.",
    render: () => <TalkWithZen />,
    code: exampleCode(talkWithZen),
  },
  {
    title: "A turn Zen did not catch",
    description: "Listening and nothing heard for 4 seconds (or Done speaking with nothing said): the heading and guidance say so in plain words and how to fix it, and Zen keeps listening. A dropped connection reads the same way: what happened, then what to do.",
    render: () => <NotCaught />,
    code: exampleCode(notCaught),
  },
  {
    title: "Voice mode on a phone",
    description: "The same conversation full screen on a white phone screen (its signal and transcript card are Surface/Alt), under a compact Top Navigation whose Back ends it. The actions keep their 48 and 56px targets.",
    render: () => <PlatformPhoneApp label="Zen voice on a phone" canvas="surface" app={PhoneVoice} />,
    code: exampleCode(phoneVoice),
  },
  {
    title: "The one-minute limit on a narrow card",
    description: "Edge cases: on a narrow card the long title truncates to one line, and a take that reaches its limit pauses itself at 01:00 and says why — Resume turns off (a main action without its handler is disabled), Finish saves it and Discard throws it away. (This demo starts three seconds before the limit.)",
    render: () => <TakeLimit />,
    code: exampleCode(takeLimit),
  },
]);
